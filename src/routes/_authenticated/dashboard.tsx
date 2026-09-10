import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, Leaf, Search, TrendingUp } from "lucide-react";

import { RideCard, type RideCardData } from "@/components/ride";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { rupees } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CampusPool @ CVR" },
      {
        name: "description",
        content: "Your CVR commute at a glance: upcoming rides, requests and savings.",
      },
      { property: "og:title", content: "Dashboard — CampusPool @ CVR" },
      { property: "og:description", content: "Upcoming rides, requests and savings." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const rides = useQuery({
    queryKey: ["dashboard-rides"],
    queryFn: async (): Promise<RideCardData[]> => {
      const { data } = await supabase
        .from("rides")
        .select(
          "id, origin_name, dest_name, departure_time, is_recurring, recurrence_days, ride_date, seats_available, seats_total, fare_share, distance_km, driver:profiles!rides_driver_id_fkey(full_name, rating, vehicle_model)",
        )
        .eq("status", "open")
        .order("departure_time")
        .limit(4);
      return (data ?? []) as unknown as RideCardData[];
    },
  });

  const impact = useQuery({
    queryKey: ["dashboard-impact", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("impact_events")
        .select("km_shared, co2_saved_kg, money_saved")
        .eq("user_id", user!.id);
      return (data ?? []).reduce(
        (acc, row) => ({
          km: acc.km + Number(row.km_shared),
          co2: acc.co2 + Number(row.co2_saved_kg),
          money: acc.money + Number(row.money_saved),
        }),
        { km: 0, co2: 0, money: 0 },
      );
    },
  });

  const requests = useQuery({
    queryKey: ["dashboard-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("id, status, pickup_name, ride_id")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const firstName = (profile?.full_name ?? "there").split(" ")[0];

  return (
    <div className="space-y-8">
      <section className="grain-panel rounded-2xl bg-primary px-6 py-8 text-primary-foreground">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Hi {firstName} 👋</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Find a classmate heading your way, or offer your seats on the Ibrahimpatnam–Hyderabad
          corridor.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link to="/find">
              <Search className="mr-2 size-4" /> Find a ride
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-transparent text-primary-foreground">
            <Link to="/offer">
              <CarFront className="mr-2 size-4" /> Offer a ride
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Shared distance"
          value={`${(impact.data?.km ?? 0).toFixed(0)} km`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="CO₂ avoided"
          value={`${(impact.data?.co2 ?? 0).toFixed(1)} kg`}
          icon={<Leaf className="size-4" />}
        />
        <StatCard
          label="Money saved"
          value={rupees(impact.data?.money ?? 0)}
          icon={<CarFront className="size-4" />}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Rides leaving soon</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/find">See all</Link>
          </Button>
        </div>
        {rides.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : rides.data && rides.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rides.data.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No open rides yet. Turn on demo mode to explore CampusPool with sample commutes.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Your recent requests</h2>
        <Card>
          <CardContent className="p-0">
            {requests.data && requests.data.length > 0 ? (
              <ul className="divide-y">
                {requests.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="text-sm">Pickup at {r.pickup_name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs capitalize text-muted-foreground">{r.status}</span>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/rides/$rideId" params={{ rideId: r.ride_id }}>
                          Open
                        </Link>
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                You haven't requested a ride yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
