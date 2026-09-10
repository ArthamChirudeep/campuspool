import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, MapPin, MessagesSquare, Route as RouteIcon } from "lucide-react";

import { Brand } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CAMPUS, DISCLAIMER } from "@/lib/campus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusPool @ CVR — student carpooling for CVR College" },
      {
        name: "description",
        content:
          "Share commutes with CVR College students across Hyderabad. Smart route matching, live ride chat and SDG 11 impact tracking.",
      },
      { property: "og:title", content: "CampusPool @ CVR — student carpooling" },
      {
        property: "og:description",
        content: "Smart campus carpooling for CVR College of Engineering, Hyderabad.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Brand />
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Share the drive to {CAMPUS.short}. Save money, cut emissions.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            CampusPool matches {CAMPUS.name} students travelling the same Hyderabad corridors —
            LB Nagar, Dilsukhnagar, Uppal, Vanasthalipuram and beyond — into shared daily commutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">See the demo</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 md:grid-cols-4">
          <Feature
            icon={<RouteIcon className="size-5" />}
            title="Smart matching"
            text="Rides are ranked by route overlap, driver detour, timing and shared weekdays."
          />
          <Feature
            icon={<MapPin className="size-5" />}
            title="Mapped routes"
            text="See the exact corridor and pickup points before you request a seat."
          />
          <Feature
            icon={<MessagesSquare className="size-5" />}
            title="Live ride chat"
            text="Confirm pickup timing with your driver and co-riders in real time."
          />
          <Feature
            icon={<Leaf className="size-5" />}
            title="SDG 11 impact"
            text="Track kilometres shared, CO₂ avoided and rupees saved every week."
          />
        </section>
      </main>

      <footer className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground">{DISCLAIMER}</p>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-6">
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
          {icon}
        </span>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
