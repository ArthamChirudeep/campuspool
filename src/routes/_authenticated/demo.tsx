import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CAMPUS, DISCLAIMER } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/demo")({
  head: () => ({
    meta: [
      { title: "Demo mode — CampusPool @ CVR" },
      {
        name: "description",
        content:
          "Load realistic CVR commuter data across LB Nagar, Dilsukhnagar, Uppal and Vanasthalipuram to walk judges through CampusPool end to end.",
      },
      { property: "og:title", content: "Demo mode — CampusPool @ CVR" },
      { property: "og:description", content: "Realistic seed data for a live walkthrough." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const queryClient = useQueryClient();

  const counts = useQuery({
    queryKey: ["demo-counts"],
    queryFn: async () => {
      const [rides, requests, profiles] = await Promise.all([
        supabase.from("rides").select("id", { count: "exact", head: true }).eq("is_demo", true),
        supabase
          .from("ride_requests")
          .select("id", { count: "exact", head: true })
          .eq("is_demo", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", true),
      ]);
      return {
        rides: rides.count ?? 0,
        requests: requests.count ?? 0,
        profiles: profiles.count ?? 0,
      };
    },
  });

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_demo_data");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Demo data regenerated — real rides untouched.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header className="grain-panel rounded-2xl bg-primary px-6 py-8 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
          <Sparkles className="size-4" aria-hidden /> Competition demo mode
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
          Walk through CampusPool with real commute patterns
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">
          Demo data mirrors genuine {CAMPUS.short} travel: students from LB Nagar, Dilsukhnagar,
          Vanasthalipuram, Uppal, Nagole, Hayathnagar, Kothapet, Saroornagar and Karmanghat driving
          overlapping corridors into Ibrahimpatnam.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Demo students" value={counts.data?.profiles ?? 0} />
        <Stat label="Demo rides" value={counts.data?.rides ?? 0} />
        <Stat label="Demo seat requests" value={counts.data?.requests ?? 0} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Suggested 3-minute walkthrough</CardTitle>
            <CardDescription>A script that shows every core feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">1.</strong> Open{" "}
                <Link to="/find" className="text-primary underline">
                  Find a ride
                </Link>{" "}
                and search from LB Nagar at 8:00 AM — see match scores and the reasons behind them.
              </li>
              <li>
                <strong className="text-foreground">2.</strong> Open a ride to see the mapped route
                with pickup points and the trip's CO₂ impact.
              </li>
              <li>
                <strong className="text-foreground">3.</strong> Request a seat, then switch to the
                driver's view to accept it and chat live.
              </li>
              <li>
                <strong className="text-foreground">4.</strong> Finish on{" "}
                <Link to="/impact" className="text-primary underline">
                  Impact
                </Link>{" "}
                to show SDG 11 progress across campus.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Reset demo data</CardTitle>
            <CardDescription>
              Regenerates every demo student, ride, request and chat. Real student data is never
              touched.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => reset.mutate()} disabled={reset.isPending}>
              <RefreshCcw className="mr-2 size-4" />
              {reset.isPending ? "Regenerating…" : "Reset demo data"}
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/find">
                <PlayCircle className="mr-2 size-4" /> Start the walkthrough
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
