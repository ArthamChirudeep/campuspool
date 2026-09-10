import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pointSchema = z.object({ lat: z.number(), lng: z.number() });

const inputSchema = z.object({
  origin: pointSchema,
  destination: pointSchema,
  waypoints: z.array(pointSchema).max(8).default([]),
});

export type RouteResult = {
  polyline: string | null;
  distanceKm: number;
  durationMin: number;
  source: "google" | "estimate";
  note?: string;
};

// Per-worker cache so repeated ride previews don't re-bill the Maps API.
const cache = new Map<string, { value: RouteResult; at: number }>();
const TTL_MS = 60 * 60 * 1000;

function key(input: z.infer<typeof inputSchema>) {
  const r = (n: number) => n.toFixed(4);
  return [
    r(input.origin.lat),
    r(input.origin.lng),
    r(input.destination.lat),
    r(input.destination.lng),
    ...input.waypoints.map((w) => `${r(w.lat)},${r(w.lng)}`),
  ].join("|");
}

function estimate(input: z.infer<typeof inputSchema>): RouteResult {
  const pts = [input.origin, ...input.waypoints, input.destination];
  let km = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dLat = (b.lat - a.lat) * 110.57;
    const dLng = (b.lng - a.lng) * 106.3;
    km += Math.hypot(dLat, dLng);
  }
  km *= 1.28; // road factor for Hyderabad arterial roads
  return {
    polyline: null,
    distanceKm: Number(km.toFixed(1)),
    durationMin: Math.max(5, Math.round((km / 24) * 60)),
    source: "estimate",
    note: "Showing an estimated route",
  };
}

export const getRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<RouteResult> => {
    const cacheKey = key(data);
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) return estimate(data);

    try {
      const response = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } },
            destination: {
              location: { latLng: { latitude: data.destination.lat, longitude: data.destination.lng } },
            },
            intermediates: data.waypoints.map((w) => ({
              location: { latLng: { latitude: w.lat, longitude: w.lng } },
            })),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        console.error(`Routes request failed [${response.status}]: ${body}`);
        return estimate(data);
      }

      const payload = (await response.json()) as {
        routes?: Array<{
          polyline?: { encodedPolyline?: string };
          distanceMeters?: number;
          duration?: string;
        }>;
      };
      const route = payload.routes?.[0];
      if (!route?.polyline?.encodedPolyline) return estimate(data);

      const value: RouteResult = {
        polyline: route.polyline.encodedPolyline,
        distanceKm: Number(((route.distanceMeters ?? 0) / 1000).toFixed(1)),
        durationMin: Math.round(Number((route.duration ?? "0s").replace("s", "")) / 60),
        source: "google",
      };
      cache.set(cacheKey, { value, at: Date.now() });
      return value;
    } catch (error) {
      console.error("Route lookup failed", error);
      return estimate(data);
    }
  });
