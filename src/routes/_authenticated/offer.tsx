import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RouteMap } from "@/components/RouteMap";
import { useAreas } from "@/components/ride";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CAMPUS, DAYS, formatDays, formatTime } from "@/lib/campus";
import { getRoute } from "@/lib/directions.functions";

export const Route = createFileRoute("/_authenticated/offer")({
  head: () => ({
    meta: [
      { title: "Offer a ride — CampusPool @ CVR" },
      {
        name: "description",
        content:
          "Publish your CVR commute in three steps: route, schedule and seats. Support one-time trips or recurring weekday commutes.",
      },
      { property: "og:title", content: "Offer a ride — CampusPool @ CVR" },
      { property: "og:description", content: "Publish a one-time or recurring campus commute." },
    ],
  }),
  component: OfferPage,
});

const STEPS = ["Route", "Schedule", "Seats & notes"] as const;

function OfferPage() {
  const { user } = useAuth();
  const { data: areas } = useAreas();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRoute = useServerFn(getRoute);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"to_campus" | "from_campus">("to_campus");
  const [areaId, setAreaId] = useState("");
  const [stopIds, setStopIds] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(true);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [rideDate, setRideDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [seats, setSeats] = useState("3");
  
  const [notes, setNotes] = useState("");

  const area = areas?.find((a) => a.id === areaId);
  const stops = (areas ?? []).filter((a) => stopIds.includes(a.id));

  const endpoints = useMemo(() => {
    if (!area) return null;
    const campus = { lat: CAMPUS.lat, lng: CAMPUS.lng, name: `${CAMPUS.short} campus` };
    const home = { lat: area.lat, lng: area.lng, name: area.name };
    return direction === "to_campus"
      ? { origin: home, destination: campus }
      : { origin: campus, destination: home };
  }, [area, direction]);


  const publish = useMutation({
    mutationFn: async () => {
      if (!user || !endpoints || !area) throw new Error("Missing route details");
      const route = await fetchRoute({
        data: {
          origin: { lat: endpoints.origin.lat, lng: endpoints.origin.lng },
          destination: { lat: endpoints.destination.lat, lng: endpoints.destination.lng },
          waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
        },
      });

      const { data: ride, error } = await supabase
        .from("rides")
        .insert({
          driver_id: user.id,
          direction,
          origin_name: endpoints.origin.name,
          origin_lat: endpoints.origin.lat,
          origin_lng: endpoints.origin.lng,
          dest_name: endpoints.destination.name,
          dest_lat: endpoints.destination.lat,
          dest_lng: endpoints.destination.lng,
          departure_time: time,
          is_recurring: isRecurring,
          recurrence_days: isRecurring ? days : [],
          ride_date: isRecurring ? null : rideDate || null,
          seats_total: Number(seats),
          seats_available: Number(seats),
          fare_share: Number(fare || suggestedFare),
          notes: notes || null,
          distance_km: route.distanceKm,
          duration_min: route.durationMin,
          route_polyline: route.polyline ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (stops.length > 0) {
        await supabase.from("ride_stops").insert(
          stops.map((s, i) => ({
            ride_id: ride.id,
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            seq: i + 1,
            eta_offset_min: (i + 1) * 8,
          })),
        );
      }

      await supabase.from("profiles").update({ is_driver: true }).eq("id", user.id);
      return ride.id as string;
    },
    onSuccess: (rideId) => {
      void queryClient.invalidateQueries();
      toast.success("Your ride is live!");
      void navigate({ to: "/rides/$rideId", params: { rideId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canContinue =
    step === 0 ? Boolean(areaId) : step === 1 ? (isRecurring ? days.length > 0 : Boolean(rideDate)) : true;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Offer a ride</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Three quick steps and your seats are visible to classmates on the same corridor.
        </p>
      </header>

      <ol className="flex flex-wrap gap-3">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm ${
              i === step
                ? "border-primary bg-primary text-primary-foreground"
                : i < step
                  ? "border-primary/40 text-primary"
                  : "text-muted-foreground"
            }`}
          >
            {i < step ? <Check className="size-3.5" aria-hidden /> : <span>{i + 1}</span>}
            {label}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="space-y-5 p-5">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select
                    value={direction}
                    onValueChange={(v) => setDirection(v as "to_campus" | "from_campus")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to_campus">Home → CVR campus</SelectItem>
                      <SelectItem value="from_campus">CVR campus → home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Your home area</Label>
                  <Select value={areaId} onValueChange={setAreaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an area" />
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
                <div className="space-y-3">
                  <Label>Pickup points along the way (optional)</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(areas ?? [])
                      .filter((a) => a.id !== areaId)
                      .map((a) => (
                        <label key={a.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={stopIds.includes(a.id)}
                            onCheckedChange={(on) =>
                              setStopIds((prev) =>
                                on ? [...prev, a.id] : prev.filter((x) => x !== a.id),
                              )
                            }
                          />
                          {a.name}
                        </label>
                      ))}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dep">Departure time</Label>
                  <Input
                    id="dep"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(v) => setIsRecurring(Boolean(v))}
                  />
                  <Label htmlFor="recurring">This is a recurring weekly commute</Label>
                </div>
                {isRecurring ? (
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <Toggle
                          key={d.value}
                          pressed={days.includes(d.value)}
                          onPressedChange={(on) =>
                            setDays((prev) =>
                              on ? [...prev, d.value] : prev.filter((x) => x !== d.value),
                            )
                          }
                          variant="outline"
                          size="sm"
                        >
                          {d.short}
                        </Toggle>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="date">Ride date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={rideDate}
                      onChange={(e) => setRideDate(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="seats">Seats you can share</Label>
                  <Select value={seats} onValueChange={setSeats}>
                    <SelectTrigger id="seats">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? "seat" : "seats"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fare">Fare share per rider</Label>
                  <Input
                    id="fare"
                    type="number"
                    min={0}
                    placeholder={String(suggestedFare)}
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Suggested {rupees(suggestedFare)} — covers fuel only, no profit.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for riders</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="e.g. I wait 5 minutes at the pickup point, boot space is limited."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex justify-between gap-3 border-t pt-5">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-2 size-4" /> Back
              </Button>
              {step < 2 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                  Continue <ArrowRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
                  Publish ride
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {endpoints ? (
            <RouteMap
              origin={endpoints.origin}
              destination={endpoints.destination}
              stops={stops.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name }))}
              className="h-72"
            />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Pick your area to preview the route
            </div>
          )}
          <Card>
            <CardContent className="space-y-1 p-5 text-sm">
              <p className="font-display font-semibold">Summary</p>
              <p className="text-muted-foreground">
                {endpoints
                  ? `${endpoints.origin.name} → ${endpoints.destination.name}`
                  : "Route not set"}
              </p>
              <p className="text-muted-foreground">
                {formatTime(time)} · {isRecurring ? formatDays(days) : rideDate || "Pick a date"}
              </p>
              <p className="text-muted-foreground">
                {seats} seats · {rupees(Number(fare || suggestedFare))} per rider
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
