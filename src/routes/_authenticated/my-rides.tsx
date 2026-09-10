import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { RideCard, type RideCardData } from "@/components/ride";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-rides")({
  head: () => ({
    meta: [
      { title: "My rides — CampusPool @ CVR" },
      {
        name: "description",
        content: "Rides you drive, seats you booked and the requests waiting on your reply.",
      },
      { property: "og:title", content: "My rides — CampusPool @ CVR" },
      { property: "og:description", content: "Your driving and riding activity in one place." },
    ],
  }),
  component: MyRides,
});

function MyRides() {
  const { user } = useAuth();

  const driving = useQuery({
    queryKey: ["my-driving", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<RideCardData[]> => {
      const { data } = await supabase
        .from("rides")
        .select(
          "id, origin_name, dest_name, departure_time, is_recurring, recurrence_days, ride_date, seats_available, seats_total, distance_km",
        )
        .eq("driver_id", user!.id)
        .order("departure_time");
      return (data ?? []) as unknown as RideCardData[];
    },
  });

  const riding = useQuery({
    queryKey: ["my-riding", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select(
          "id, status, pickup_name, ride:rides(id, origin_name, dest_name, departure_time, is_recurring, recurrence_days, ride_date, seats_available, seats_total, distance_km)",
        )
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My rides</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you're driving or riding on the CVR corridor.
        </p>
      </header>

      <Tabs defaultValue="driving">
        <TabsList>
          <TabsTrigger value="driving">Driving</TabsTrigger>
          <TabsTrigger value="riding">Riding</TabsTrigger>
        </TabsList>

        <TabsContent value="driving" className="pt-6">
          {driving.data && driving.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {driving.data.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          ) : (
            <EmptyState
              text="You haven't offered a ride yet."
              action={
                <Button asChild size="sm">
                  <Link to="/offer">Offer a ride</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="riding" className="pt-6">
          {riding.data && riding.data.length > 0 ? (
            <div className="space-y-4">
              {riding.data.map((req) => {
                const ride = req.ride as unknown as RideCardData | null;
                if (!ride) return null;
                return (
                  <Card key={req.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div>
                        <p className="font-display font-semibold">
                          {ride.origin_name} → {ride.dest_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Pickup at {req.pickup_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="capitalize">
                          {req.status}
                        </Badge>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/rides/$rideId" params={{ rideId: ride.id }}>
                            Open
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              text="No seat requests yet."
              action={
                <Button asChild size="sm">
                  <Link to="/find">Find a ride</Link>
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
