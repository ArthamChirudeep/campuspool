import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RideCard, useAreas } from "@/components/ride";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { DAYS } from "@/lib/campus";
import { matchRides, type RankedRide } from "@/lib/match.functions";

export const Route = createFileRoute("/_authenticated/find")({
  head: () => ({
    meta: [
      { title: "Find a ride — CampusPool @ CVR" },
      {
        name: "description",
        content:
          "Smart-match with CVR classmates driving your corridor: LB Nagar, Dilsukhnagar, Uppal, Vanasthalipuram and more.",
      },
      { property: "og:title", content: "Find a ride — CampusPool @ CVR" },
      {
        property: "og:description",
        content: "Smart route and timing matching for CVR College commutes.",
      },
    ],
  }),
  component: FindPage,
});

function FindPage() {
  const { data: areas } = useAreas();
  const runMatch = useServerFn(matchRides);

  const [areaId, setAreaId] = useState<string>("");
  const [time, setTime] = useState("08:30");
  const [windowMinutes, setWindowMinutes] = useState("30");
  const [direction, setDirection] = useState<"to_campus" | "from_campus">("to_campus");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const search = useMutation({
    mutationFn: async (): Promise<RankedRide[]> => {
      const area = areas?.find((a) => a.id === areaId);
      if (!area) throw new Error("Pick your pickup area first");
      return runMatch({
        data: {
          pickup: { lat: area.lat, lng: area.lng },
          preferredTime: time,
          windowMinutes: Number(windowMinutes),
          days,
          direction,
        },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Find a ride</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We rank rides by how closely their route passes you, the driver's detour, timing and
          shared weekdays.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Pickup area</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your area" />
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
            <Label htmlFor="time">Preferred departure</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Flexibility</Label>
            <Select value={windowMinutes} onValueChange={setWindowMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">± 15 minutes</SelectItem>
                <SelectItem value="30">± 30 minutes</SelectItem>
                <SelectItem value="60">± 1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Days you travel</Label>
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

          <div className="md:col-span-2">
            <Button
              onClick={() => search.mutate()}
              disabled={search.isPending || !areaId}
              className="w-full sm:w-auto"
            >
              <Search className="mr-2 size-4" /> Show smart matches
            </Button>
          </div>
        </CardContent>
      </Card>

      {search.isPending && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      )}

      {search.data && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">
            {search.data.length} matching {search.data.length === 1 ? "ride" : "rides"}
          </h2>
          {search.data.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No rides fit those filters yet. Try widening your time flexibility or a nearby area.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {search.data.map((m) => (
                <RideCard
                  key={m.rideId}
                  ride={{
                    ...m.ride,
                    driver: m.ride.driver
                      ? {
                          full_name: m.ride.driver.full_name,
                          rating: m.ride.driver.rating,
                          vehicle_model: m.ride.driver.vehicle_model,
                        }
                      : null,
                  }}
                  score={m.score}
                  reasons={m.reasons}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
