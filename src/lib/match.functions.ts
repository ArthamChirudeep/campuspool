import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rankRides, type MatchRide, type MatchResult } from "./match";

const inputSchema = z.object({
  pickup: z.object({ lat: z.number(), lng: z.number() }),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  windowMinutes: z.number().min(5).max(180).default(30),
  days: z.array(z.number().min(0).max(6)).max(7).default([]),
  direction: z.enum(["to_campus", "from_campus"]).default("to_campus"),
});

export type MatchDriver = {
  id: string;
  full_name: string;
  rating: number;
  avatar_url: string | null;
  department: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
};

export type MatchRideDTO = MatchRide & {
  origin_name: string;
  dest_name: string;
  
  notes: string | null;
  seats_total: number;
  driver: MatchDriver | null;
};

export type RankedRide = MatchResult & { ride: MatchRideDTO };

export const matchRides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<RankedRide[]> => {
    const { data: rides, error } = await context.supabase
      .from("rides")
      .select(
        "id, direction, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_time, ride_date, is_recurring, recurrence_days, seats_total, seats_available, notes, distance_km, driver:profiles!rides_driver_id_fkey(id, full_name, rating, avatar_url, department, vehicle_model, vehicle_color)",
      )
      .eq("status", "open")
      .limit(200);

    if (error) throw new Error(error.message);

    const candidates: MatchRideDTO[] = (rides ?? []).map((r) => {
      const driverRow = (r as { driver: MatchDriver | MatchDriver[] | null }).driver;
      const driver = Array.isArray(driverRow) ? (driverRow[0] ?? null) : driverRow;
      return {
        id: r.id,
        direction: r.direction as "to_campus" | "from_campus",
        origin_name: r.origin_name,
        origin_lat: Number(r.origin_lat),
        origin_lng: Number(r.origin_lng),
        dest_name: r.dest_name,
        dest_lat: Number(r.dest_lat),
        dest_lng: Number(r.dest_lng),
        departure_time: String(r.departure_time).slice(0, 5),
        ride_date: r.ride_date,
        is_recurring: r.is_recurring,
        recurrence_days: r.recurrence_days ?? [],
        seats_total: r.seats_total,
        seats_available: r.seats_available,
        
        notes: r.notes,
        distance_km: Number(r.distance_km),
        driver_rating: Number(driver?.rating ?? 4.5),
        driver: driver
          ? {
              id: driver.id,
              full_name: driver.full_name,
              rating: Number(driver.rating),
              avatar_url: driver.avatar_url ?? null,
              department: driver.department ?? null,
              vehicle_model: driver.vehicle_model ?? null,
              vehicle_color: driver.vehicle_color ?? null,
            }
          : null,
      };
    });

    const ranked = rankRides(candidates, {
      pickup: data.pickup,
      preferredTime: data.preferredTime,
      windowMinutes: data.windowMinutes,
      days: data.days,
      direction: data.direction,
    });

    return ranked
      .map((m) => {
        const ride = candidates.find((r) => r.id === m.rideId);
        return ride ? { ...m, ride } : null;
      })
      .filter((x): x is RankedRide => x !== null)
      .slice(0, 20);
  });
