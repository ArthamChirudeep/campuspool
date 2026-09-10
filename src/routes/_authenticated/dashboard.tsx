import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, Leaf, Search, TrendingUp } from "lucide-react";

import { RideCard, type RideCardData } from "@/components/ride";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CampusPool @ CVR" },
      {
        name: "description",
        content: "Your CVR commute at a glance: upcoming lifts, requests and shared impact.",
      },
      { property: "og:title", content: "Dashboard — CampusPool @ CVR" },
      { property: "og:description", content: "Upcoming lifts, requests and shared impact." },
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
          "id, origin_name, dest_name, departure_time, is_recurring, recurrence_days, ride_date, seats_available, seats_total, distance_km, driver:profiles!rides_driver_id_fkey(full_name, rating, vehicle_model)",
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
        .select("km_shared, co2_saved_kg, seats_filled")
        .eq("user_id", user!.id);
      return (data ?? []).reduce(
        (acc, row) => ({
          km: acc.km + Number(row.km_shared),
          co2: acc.co2 + Number(row.co2_saved_kg),
          seats: acc.seats + Number(row.seats_filled ?? 0),
        }),
        { km: 0, co2: 0, seats: 0 },
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
      <section className="grain-panel drift-glow rise-in relative overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-foreground shadow-[0_18px_48px_-18px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-primary-foreground/10 blur-3xl"
        />
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Hi {firstName} 👋</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Find a classmate heading your way, or offer your seats on the Ibrahimpatnam–Hyderabad
          corridor.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary" className="hover-scale">
            <Link to="/find">
              <Search className="mr-2 size-4" /> Find a ride
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="hover-scale bg-transparent text-primary-foreground"
          >
            <Link to="/offer">
              <CarFront className="mr-2 size-4" /> Offer a ride
            </Link>
          </Button>
        </div>
      </section>

      <section className="rise-in grid gap-4 sm:grid-cols-3" style={{ animationDelay: "90ms" }}>
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
          label="Seats shared"
          value={`${impact.data?.seats ?? 0}`}
          icon={<CarFront className="size-4" />}
        />
      </section>

      <section className="rise-in space-y-4" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Rides leaving soon</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/find" className="story-link">
              See all
            </Link>
          </Button>
        </div>
        {rides.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : rides.data && rides.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rides.data.map((ride, i) => (
              <div
                key={ride.id}
                className="rise-in card-interactive rounded-xl"
                style={{ animationDelay: `${220 + i * 70}ms` }}
              >
                <RideCard ride={ride} />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No open rides yet. Turn on demo mode to explore CampusPool with sample commutes.
          </p>
        )}
      </section>

      <section className="rise-in space-y-4" style={{ animationDelay: "260ms" }}>
        <h2 className="font-display text-xl font-semibold">Your recent requests</h2>
        <Card className="card-interactive">
          <CardContent className="p-0">
            {requests.data && requests.data.length > 0 ? (
              <ul className="divide-y">
                {requests.data.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
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
