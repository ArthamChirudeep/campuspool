import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Star, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDays, formatTime } from "@/lib/campus";

export type AreaRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  corridor: string | null;
};

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<AreaRow[]> => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name, lat, lng, corridor")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCampusSettings() {
  return useQuery({
    queryKey: ["campus-settings"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("campus_settings").select("*").maybeSingle();
      return data;
    },
  });
}

export type RideCardData = {
  id: string;
  origin_name: string;
  dest_name: string;
  departure_time: string;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  ride_date: string | null;
  seats_available: number;
  seats_total: number;
  
  distance_km: number;
  driver?: { full_name: string; rating: number; vehicle_model: string | null } | null;
};

export function RideCard({
  ride,
  score,
  reasons,
  action,
}: {
  ride: RideCardData;
  score?: number;
  reasons?: string[];
  action?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-display text-base font-semibold">
              {ride.origin_name}
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              {ride.dest_name}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden /> {formatTime(ride.departure_time)}
              </span>
              <span>
                {ride.is_recurring
                  ? formatDays(ride.recurrence_days)
                  : (ride.ride_date ?? "One-time")}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" aria-hidden /> {ride.seats_available}/{ride.seats_total}{" "}
                seats
              </span>
            </p>
          </div>
          {typeof score === "number" && (
            <Badge className="shrink-0 bg-primary text-primary-foreground">
              {Math.round(score)}% match
            </Badge>
          )}
        </div>

        {ride.driver && (
          <p className="text-sm text-muted-foreground">
            {ride.driver.full_name}
            {ride.driver.vehicle_model ? ` · ${ride.driver.vehicle_model}` : ""} ·{" "}
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-current text-primary" aria-hidden />
              {Number(ride.driver.rating).toFixed(1)}
            </span>
          </p>
        )}

        {reasons && reasons.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {reasons.slice(0, 4).map((r) => (
              <li key={r}>
                <Badge variant="secondary" className="font-normal">
                  {r}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <span className="text-sm">
            <span className="font-display text-lg font-bold">Free lift</span>
            <span className="text-muted-foreground"> · {ride.distance_km.toFixed(1)} km</span>
          </span>
          {action ?? (
            <Button asChild size="sm">
              <Link to="/rides/$rideId" params={{ rideId: ride.id }}>
                View ride
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
