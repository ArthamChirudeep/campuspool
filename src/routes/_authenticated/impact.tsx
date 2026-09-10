import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bus, Leaf, PiggyBank, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { rupees } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/impact")({
  head: () => ({
    meta: [
      { title: "Sustainability impact — CampusPool @ CVR" },
      {
        name: "description",
        content:
          "Track kilometres shared, CO₂ avoided and money saved, plus the campus-wide contribution to UN SDG 11.",
      },
      { property: "og:title", content: "Sustainability impact — CampusPool @ CVR" },
      {
        property: "og:description",
        content: "Personal and campus-wide carpooling impact against SDG 11.",
      },
    ],
  }),
  component: ImpactPage,
});

type Row = { km_shared: number; co2_saved_kg: number; money_saved: number; occurred_at: string };


function ImpactPage() {
  const { user } = useAuth();

  const events = useQuery({
    queryKey: ["impact-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("impact_events")
        .select("km_shared, co2_saved_kg, money_saved, occurred_at, user_id, seats_filled");
      return data ?? [];
    },
  });

  const rows = events.data ?? [];
  const mine = rows.filter((r) => r.user_id === user?.id) as unknown as Row[];
  const campus = rows as unknown as Row[];

  const sum = (list: Row[]) =>
    list.reduce(
      (acc, r) => ({
        km: acc.km + Number(r.km_shared),
        co2: acc.co2 + Number(r.co2_saved_kg),
        money: acc.money + Number(r.money_saved),
      }),
      { km: 0, co2: 0, money: 0 },
    );

  const my = sum(mine);
  const all = sum(campus);
  const seats = rows.reduce((a, r) => a + Number(r.seats_filled ?? 0), 0);

  const monthly = Object.values(
    campus.reduce<Record<string, { month: string; co2: number; km: number }>>((acc, r) => {
      const month = new Date(r.occurred_at).toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      const entry = acc[month] ?? { month, co2: 0, km: 0 };
      entry.co2 += Number(r.co2_saved_kg);
      entry.km += Number(r.km_shared);
      acc[month] = entry;
      return acc;
    }, {}),
  ).slice(-6);

  const target = 500;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your sustainability impact</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every shared seat removes a car from the Ibrahimpatnam–Hyderabad road.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={<Bus className="size-4" />}
          label="Kilometres shared"
          value={`${my.km.toFixed(0)} km`}
        />
        <Metric
          icon={<Leaf className="size-4" />}
          label="CO₂ avoided"
          value={`${my.co2.toFixed(1)} kg`}
        />
        <Metric
          icon={<PiggyBank className="size-4" />}
          label="Money saved"
          value={rupees(my.money)}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">SDG 11 — Sustainable cities & communities</CardTitle>
          <CardDescription>
            Campus goal: avoid {target} kg of CO₂ this semester through shared commutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={Math.min(100, (all.co2 / target) * 100)} />
          <p className="text-sm text-muted-foreground">
            {all.co2.toFixed(1)} kg of {target} kg avoided across campus · {seats} seats filled ·{" "}
            {rupees(all.money)} kept in students' pockets.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 sm:pt-2">
            <Metric
              icon={<Users className="size-4" />}
              label="Campus km shared"
              value={`${all.km.toFixed(0)} km`}
            />
            <Metric
              icon={<Leaf className="size-4" />}
              label="Campus CO₂ avoided"
              value={`${all.co2.toFixed(1)} kg`}
            />
            <Metric
              icon={<PiggyBank className="size-4" />}
              label="Campus savings"
              value={rupees(all.money)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">CO₂ avoided per month</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trips recorded yet — completed rides will show up here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  formatter={(v: number) => [`${Number(v).toFixed(1)} kg`, "CO₂ avoided"]}
                  cursor={{ opacity: 0.1 }}
                />
                <Bar dataKey="co2" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
