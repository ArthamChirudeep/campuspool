import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Send, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { RouteMap } from "@/components/RouteMap";
import { useAreas } from "@/components/ride";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { co2ForKm, formatDays, formatTime } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/rides/$rideId")({
  head: () => ({
    meta: [
      { title: "Ride details — CampusPool @ CVR" },
      {
        name: "description",
        content: "Route map, pickup points, seat requests and ride chat for this CVR commute.",
      },
      { property: "og:title", content: "Ride details — CampusPool @ CVR" },
      { property: "og:description", content: "Route, pickup points and ride chat." },
    ],
  }),
  component: RideDetail,
});

function RideDetail() {
  const { rideId } = useParams({ from: "/_authenticated/rides/$rideId" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: areas } = useAreas();
  const [pickupId, setPickupId] = useState("");
  const [note, setNote] = useState("");

  const ride = useQuery({
    queryKey: ["ride", rideId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(
          "*, driver:profiles!rides_driver_id_fkey(id, full_name, rating, vehicle_model, vehicle_color, vehicle_plate, department), stops:ride_stops(id, name, lat, lng, seq)",
        )
        .eq("id", rideId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const requests = useQuery({
    queryKey: ["ride-requests", rideId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("*, rider:profiles!ride_requests_rider_id_fkey(full_name, rating)")
        .eq("ride_id", rideId)
        .order("created_at");
      return data ?? [];
    },
  });

  const isDriver = ride.data?.driver_id === user?.id;
  const myRequest = requests.data?.find((r) => r.rider_id === user?.id);
  const isParticipant = isDriver || myRequest?.status === "accepted";

  const requestSeat = useMutation({
    mutationFn: async () => {
      const area = areas?.find((a) => a.id === pickupId);
      if (!area || !user) throw new Error("Choose a pickup point");
      const { error } = await supabase.from("ride_requests").insert({
        ride_id: rideId,
        rider_id: user.id,
        pickup_name: area.name,
        pickup_lat: area.lat,
        pickup_lng: area.lng,
        message: note || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Request sent to the driver");
      void queryClient.invalidateQueries({ queryKey: ["ride-requests", rideId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("ride_requests").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
      if (status === "accepted" && ride.data) {
        const left = Math.max(0, ride.data.seats_available - 1);
        await supabase
          .from("rides")
          .update({ seats_available: left, status: left === 0 ? "full" : "open" })
          .eq("id", rideId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Request updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (ride.isLoading) return <Skeleton className="h-96" />;
  if (!ride.data) return <p className="text-sm text-muted-foreground">Ride not found.</p>;

  const r = ride.data;
  const driver = r.driver as unknown as {
    full_name: string;
    rating: number;
    vehicle_model: string | null;
    vehicle_color: string | null;
    vehicle_plate: string | null;
    department: string | null;
  } | null;
  const stops = ((r.stops ?? []) as Array<{ name: string; lat: number; lng: number; seq: number }>)
    .slice()
    .sort((a, b) => a.seq - b.seq);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {r.origin_name} → {r.dest_name}
          </h1>
          <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{formatTime(String(r.departure_time).slice(0, 5))}</span>
            <span>{r.is_recurring ? formatDays(r.recurrence_days) : (r.ride_date ?? "One-time")}</span>
            <Badge variant="secondary" className="capitalize">
              {r.status}
            </Badge>
          </p>
        </header>

        <RouteMap
          origin={{ lat: r.origin_lat, lng: r.origin_lng, name: r.origin_name }}
          destination={{ lat: r.dest_lat, lng: r.dest_lng, name: r.dest_name }}
          stops={stops.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name }))}
          className="h-80"
        />

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Trip impact if seats fill</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <Stat label="Distance" value={`${Number(r.distance_km).toFixed(1)} km`} />
            <Stat
              label="CO₂ avoided"
              value={`${co2ForKm(Number(r.distance_km) * (r.seats_total - 1)).toFixed(1)} kg`}
            />
            <Stat label="Car trips avoided" value={`${Math.max(0, r.seats_total - 1)}`} />
          </CardContent>
        </Card>

        {isParticipant ? (
          <RideChat rideId={rideId} driverId={r.driver_id} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Ride group chat</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The group chat opens for everyone travelling in this lift once the driver accepts your
              seat request.
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{driver?.full_name ?? "Student driver"}</p>
            {driver?.department && <p className="text-muted-foreground">{driver.department}</p>}
            <p className="flex items-center gap-1 text-muted-foreground">
              <Star className="size-3.5 fill-current text-primary" aria-hidden />
              {Number(driver?.rating ?? 4.5).toFixed(1)}
            </p>
            {driver?.vehicle_model && (
              <p className="text-muted-foreground">
                {driver.vehicle_color} {driver.vehicle_model}
                {driver.vehicle_plate ? ` · ${driver.vehicle_plate}` : ""}
              </p>
            )}
            <p className="pt-2 font-display text-xl font-bold">Free lift</p>
            <p className="text-muted-foreground">
              {r.seats_available} of {r.seats_total} seats free
            </p>
            {r.notes && <p className="pt-2 text-muted-foreground">“{r.notes}”</p>}
          </CardContent>
        </Card>

        {!isDriver && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Request a seat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myRequest ? (
                <p className="text-sm text-muted-foreground">
                  Your request is <span className="font-medium capitalize">{myRequest.status}</span>{" "}
                  for pickup at {myRequest.pickup_name}.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Pickup point</Label>
                    <Select value={pickupId} onValueChange={setPickupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Where should the driver stop?" />
                      </SelectTrigger>
                      <SelectContent>
                        {(areas ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Message (optional)</Label>
                    <Input
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="I'll be at the bus stop by 8:05"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => requestSeat.mutate()}
                    disabled={requestSeat.isPending || r.seats_available === 0}
                  >
                    {r.seats_available === 0 ? "Ride is full" : "Request seat"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isDriver && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Seat requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(requests.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              )}
              {(requests.data ?? []).map((req) => {
                const rider = req.rider as unknown as { full_name: string } | null;
                return (
                  <div key={req.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                    <p className="text-sm font-medium">{rider?.full_name ?? "Student"}</p>
                    <p className="text-xs text-muted-foreground">Pickup: {req.pickup_name}</p>
                    {req.message && <p className="text-xs text-muted-foreground">“{req.message}”</p>}
                    {req.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide.mutate({ id: req.id, status: "accepted" })}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide.mutate({ id: req.id, status: "declined" })}
                        >
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {req.status}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}

type ChatMessage = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

type RideMember = { id: string; full_name: string; isDriver: boolean };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function RideChat({ rideId, driverId }: { rideId: string; driverId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = useQuery({
    queryKey: ["messages", rideId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("ride_id", rideId)
        .order("created_at");
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["ride-members", rideId],
    queryFn: async (): Promise<RideMember[]> => {
      const [{ data: driver }, { data: riders }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("id", driverId).maybeSingle(),
        supabase
          .from("ride_requests")
          .select("rider:profiles!ride_requests_rider_id_fkey(id, full_name)")
          .eq("ride_id", rideId)
          .eq("status", "accepted"),
      ]);
      const list: RideMember[] = [];
      if (driver) list.push({ id: driver.id, full_name: driver.full_name, isDriver: true });
      for (const row of riders ?? []) {
        const p = row.rider as unknown as { id: string; full_name: string } | null;
        if (p) list.push({ id: p.id, full_name: p.full_name, isDriver: false });
      }
      return list;
    },
  });

  const nameFor = (id: string) =>
    members.data?.find((m) => m.id === id)?.full_name ?? "Ride member";

  useEffect(() => {
    const channel = supabase
      .channel(`ride-chat-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", rideId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [rideId, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.data]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !text.trim()) return;
      const { error } = await supabase
        .from("messages")
        .insert({ ride_id: rideId, sender_id: user.id, body: text.trim() });
      if (error) throw new Error(error.message);
      setText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-display text-lg">Ride group chat</CardTitle>
          <span className="text-xs text-muted-foreground">
            {(members.data ?? []).length} member{(members.data ?? []).length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(members.data ?? []).map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-xs"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {initials(m.full_name)}
              </span>
              {m.id === user?.id ? "You" : m.full_name}
              {m.isDriver && <span className="text-muted-foreground">· driver</span>}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {(messages.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Say hello to everyone in this lift and agree on the pickup timing.
            </p>
          )}
          {(messages.data ?? []).map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`max-w-[80%] space-y-1 ${mine ? "ml-auto" : ""}`}>
                <p
                  className={`flex items-center gap-2 text-[11px] text-muted-foreground ${
                    mine ? "justify-end" : ""
                  }`}
                >
                  <span className="font-medium">{mine ? "You" : nameFor(m.sender_id)}</span>
                  <span>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message the group"
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={send.isPending}>
            <Send className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
