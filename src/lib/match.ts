import { distanceToSegmentKm, haversineKm, minutesFromTime, type LatLng } from "./campus";

export type MatchRide = {
  id: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  departure_time: string;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  ride_date: string | null;
  seats_available: number;
  distance_km: number;
  direction: "to_campus" | "from_campus";
  driver_rating?: number;
};

export type MatchQuery = {
  pickup: LatLng;
  preferredTime: string;
  windowMinutes: number;
  days: number[];
  direction: "to_campus" | "from_campus";
};

export type MatchResult = {
  rideId: string;
  score: number;
  detourKm: number;
  detourMinutes: number;
  timeGapMinutes: number;
  corridorKm: number;
  overlapPercent: number;
  reasons: string[];
};

const AVG_SPEED_KMH = 26;

/**
 * Deterministic match scoring — identical inputs always produce identical
 * output. No randomness, no time-of-day dependence.
 */
export function scoreRide(ride: MatchRide, query: MatchQuery): MatchResult | null {
  if (ride.direction !== query.direction) return null;
  if (ride.seats_available <= 0) return null;

  const origin: LatLng = { lat: ride.origin_lat, lng: ride.origin_lng };
  const dest: LatLng = { lat: ride.dest_lat, lng: ride.dest_lng };

  // 1. Corridor proximity — how far the rider is from the driver's path.
  const corridorKm = distanceToSegmentKm(query.pickup, origin, dest);
  if (corridorKm > 8) return null;
  const corridorScore = clamp01(1 - corridorKm / 6);

  // 2. Detour cost for the driver.
  const direct = haversineKm(origin, dest) || 1;
  const viaPickup = haversineKm(origin, query.pickup) + haversineKm(query.pickup, dest);
  const detourKm = Math.max(0, viaPickup - direct);
  const detourMinutes = Math.round((detourKm / AVG_SPEED_KMH) * 60);
  const detourScore = clamp01(1 - detourKm / 6);

  // 3. Departure time gap.
  const timeGap = Math.abs(minutesFromTime(ride.departure_time) - minutesFromTime(query.preferredTime));
  if (timeGap > query.windowMinutes + 45) return null;
  const timeScore = clamp01(1 - timeGap / Math.max(20, query.windowMinutes + 30));

  // 4. Day overlap for recurring commutes.
  const rideDays = ride.is_recurring ? (ride.recurrence_days ?? []) : dayOfRide(ride.ride_date);
  const wanted = query.days.length ? query.days : rideDays;
  const shared = wanted.filter((d) => rideDays.includes(d));
  const dayScore = wanted.length === 0 ? 0.6 : shared.length / wanted.length;

  // 5. Seats and driver reputation.
  const seatScore = clamp01(ride.seats_available / 3);
  const ratingScore = clamp01(((ride.driver_rating ?? 4.5) - 3.5) / 1.5);

  const score = Math.round(
    100 *
      (0.32 * corridorScore +
        0.24 * detourScore +
        0.22 * timeScore +
        0.14 * dayScore +
        0.05 * seatScore +
        0.03 * ratingScore),
  );

  const overlapPercent = Math.round(corridorScore * 100);

  const reasons: string[] = [];
  if (corridorKm < 0.8) reasons.push("Pickup is right on the driver's route");
  else reasons.push(`Pickup is ${corridorKm.toFixed(1)} km off the route`);
  reasons.push(detourMinutes <= 1 ? "Almost no detour for the driver" : `${detourMinutes} min detour`);
  reasons.push(
    timeGap === 0
      ? "Leaves exactly at your preferred time"
      : `Leaves ${timeGap} min ${minutesFromTime(ride.departure_time) > minutesFromTime(query.preferredTime) ? "after" : "before"} your time`,
  );
  if (shared.length) reasons.push(`Matches ${shared.length} of your ${wanted.length} commute days`);
  reasons.push(`${ride.seats_available} seat${ride.seats_available === 1 ? "" : "s"} left`);

  return {
    rideId: ride.id,
    score,
    detourKm: Number(detourKm.toFixed(2)),
    detourMinutes,
    timeGapMinutes: timeGap,
    corridorKm: Number(corridorKm.toFixed(2)),
    overlapPercent,
    reasons,
  };
}

export function rankRides(rides: MatchRide[], query: MatchQuery): MatchResult[] {
  return rides
    .map((r) => scoreRide(r, query))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.score - a.score || a.rideId.localeCompare(b.rideId));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function dayOfRide(date: string | null): number[] {
  if (!date) return [];
  const d = new Date(`${date}T00:00:00Z`);
  return [d.getUTCDay()];
}
