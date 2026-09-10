import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Navigation, Route as RouteIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { decodePolyline, type LatLng } from "@/lib/campus";
import { getRoute } from "@/lib/directions.functions";
import { cn } from "@/lib/utils";

export type MapStop = LatLng & { name: string };

type Props = {
  origin: MapStop;
  destination: MapStop;
  stops?: MapStop[];
  className?: string;
  compact?: boolean;
};

type GMapOptions = Record<string, unknown>;
type GBounds = { extend: (p: LatLng) => void };
type GMap = { fitBounds: (b: GBounds, padding?: number) => void };
type GoogleMapsApi = {
  Map: new (el: HTMLElement, options: GMapOptions) => GMap;
  Polyline: new (options: GMapOptions) => unknown;
  Marker: new (options: GMapOptions) => unknown;
  LatLngBounds: new () => GBounds;
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    __campusPoolMapsInit?: () => void;
  }
}


let loaderPromise: Promise<boolean> | null = null;

function loadMaps(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.maps) return Promise.resolve(true);
  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  if (!key) return Promise.resolve(false);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), 8000);
    window.__campusPoolMapsInit = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
      | string
      | undefined;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__campusPoolMapsInit${channel ? `&channel=${channel}` : ""}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function RouteMap({ origin, destination, stops = [], className, compact }: Props) {
  const fetchRoute = useServerFn(getRoute);
  const [mapsReady, setMapsReady] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const routeQuery = useQuery({
    queryKey: [
      "route",
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng,
      stops.map((s) => `${s.lat},${s.lng}`).join("|"),
    ],
    queryFn: () =>
      fetchRoute({
        data: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
        },
      }),
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    let cancelled = false;
    void loadMaps().then((ok) => {
      if (!cancelled) setMapsReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !containerRef.current || !window.google?.maps) return;
    try {
      const g = window.google.maps;
      const path: LatLng[] = routeQuery.data?.polyline
        ? decodePolyline(routeQuery.data.polyline)
        : [origin, ...stops, destination];

      const map = new g.Map(containerRef.current, {
        center: { lat: (origin.lat + destination.lat) / 2, lng: (origin.lng + destination.lng) / 2 },
        zoom: 12,
        disableDefaultUI: compact,
        streetViewControl: false,
        mapTypeControl: false,
      });

      new g.Polyline({
        path,
        map,
        strokeColor: "#1f6f4a",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });

      const bounds = new g.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      [origin, ...stops, destination].forEach((point, index, arr) => {
        new g.Marker({
          position: { lat: point.lat, lng: point.lng },
          map,
          title: point.name,
          label:
            index === 0 ? "A" : index === arr.length - 1 ? "B" : String(index),
        });
        bounds.extend({ lat: point.lat, lng: point.lng });
      });
      map.fitBounds(bounds, 48);
    } catch (error) {
      console.error("Map render failed", error);
      setMapsReady(false);
    }
  }, [mapsReady, routeQuery.data, origin, destination, stops, compact]);

  const distance = routeQuery.data?.distanceKm;
  const duration = routeQuery.data?.durationMin;

  if (mapsReady === false) {
    return (
      <RouteStrip
        origin={origin}
        destination={destination}
        stops={stops}
        distanceKm={distance}
        durationMin={duration}
        className={className}
        note="Map view unavailable — showing the route outline"
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}>
      <div ref={containerRef} className="h-full min-h-[220px] w-full" />
      {mapsReady === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
      {(distance || duration) && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-card/95 px-3 py-1 text-xs font-medium shadow">
          {distance ? `${distance} km` : ""}
          {distance && duration ? " · " : ""}
          {duration ? `${duration} min` : ""}
          {routeQuery.data?.source === "estimate" ? " · estimated" : ""}
        </div>
      )}
    </div>
  );
}

export function RouteStrip({
  origin,
  destination,
  stops = [],
  distanceKm,
  durationMin,
  className,
  note,
}: {
  origin: MapStop;
  destination: MapStop;
  stops?: MapStop[];
  distanceKm?: number | undefined;
  durationMin?: number | undefined;
  className?: string | undefined;
  note?: string | undefined;

}) {
  const points = [origin, ...stops, destination];
  return (
    <div className={cn("grain-panel rounded-xl border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <RouteIcon className="size-4 text-primary" aria-hidden />
          Route outline
        </span>
        {(distanceKm || durationMin) && (
          <span className="text-xs text-muted-foreground">
            {distanceKm ? `${distanceKm} km` : ""}
            {distanceKm && durationMin ? " · " : ""}
            {durationMin ? `${durationMin} min` : ""}
          </span>
        )}
      </div>
      <ol className="relative space-y-4 border-l-2 border-dashed border-primary/40 pl-6">
        {points.map((p, i) => (
          <li key={`${p.name}-${i}`} className="relative">
            <span className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {i === points.length - 1 ? (
                <Navigation className="size-3" aria-hidden />
              ) : (
                <MapPin className="size-3" aria-hidden />
              )}
            </span>
            <p className="text-sm font-medium leading-tight">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {i === 0 ? "Start" : i === points.length - 1 ? "Destination" : "Pickup point"}
            </p>
          </li>
        ))}
      </ol>
      {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
