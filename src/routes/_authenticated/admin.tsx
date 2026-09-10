import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCampusSettings } from "@/components/ride";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Campus settings — CampusPool @ CVR" },
      {
        name: "description",
        content: "Configure campus location, fuel and emission factors, and demo mode.",
      },
      { property: "og:title", content: "Campus settings — CampusPool @ CVR" },
      { property: "og:description", content: "Admin configuration for CampusPool." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: settings } = useCampusSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    campus_name: "",
    campus_short: "",
    address: "",
    city: "",
    lat: "",
    lng: "",
    fuel_price_per_litre: "",
    km_per_litre: "",
    co2_kg_per_km: "",
    endorsement_note: "",
    demo_mode_enabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      campus_name: settings.campus_name,
      campus_short: settings.campus_short,
      address: settings.address,
      city: settings.city,
      lat: String(settings.lat),
      lng: String(settings.lng),
      fuel_price_per_litre: String(settings.fuel_price_per_litre),
      km_per_litre: String(settings.km_per_litre),
      co2_kg_per_km: String(settings.co2_kg_per_km),
      endorsement_note: settings.endorsement_note,
      demo_mode_enabled: settings.demo_mode_enabled,
    });
  }, [settings]);

  const claimAdmin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("bootstrap_admin");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("You are now the campus admin");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("campus_settings")
        .update({
          campus_name: form.campus_name,
          campus_short: form.campus_short,
          address: form.address,
          city: form.city,
          lat: Number(form.lat),
          lng: Number(form.lng),
          fuel_price_per_litre: Number(form.fuel_price_per_litre),
          km_per_litre: Number(form.km_per_litre),
          co2_kg_per_km: Number(form.co2_kg_per_km),
          endorsement_note: form.endorsement_note,
          demo_mode_enabled: form.demo_mode_enabled,
        })
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campus-settings"] });
      toast.success("Campus settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="font-display">Admin access</CardTitle>
          <CardDescription>
            Campus settings are admin-only. If you set up this CampusPool, claim the first admin
            seat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => claimAdmin.mutate()} disabled={claimAdmin.isPending}>
            Claim admin access
          </Button>
        </CardContent>
      </Card>
    );
  }

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Campus settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure the campus, savings factors and demo mode.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <Field id="campus_name" label="Campus name">
            <Input
              id="campus_name"
              value={form.campus_name}
              onChange={(e) => set("campus_name", e.target.value)}
            />
          </Field>
          <Field id="campus_short" label="Short name">
            <Input
              id="campus_short"
              value={form.campus_short}
              onChange={(e) => set("campus_short", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="address" label="Address">
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
          </div>
          <Field id="city" label="City">
            <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field id="lat" label="Latitude">
            <Input id="lat" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
          </Field>
          <Field id="lng" label="Longitude">
            <Input id="lng" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
          </Field>
          <Field id="fuel" label="Fuel price (₹/litre)">
            <Input
              id="fuel"
              value={form.fuel_price_per_litre}
              onChange={(e) => set("fuel_price_per_litre", e.target.value)}
            />
          </Field>
          <Field id="kmpl" label="Mileage (km/litre)">
            <Input
              id="kmpl"
              value={form.km_per_litre}
              onChange={(e) => set("km_per_litre", e.target.value)}
            />
          </Field>
          <Field id="co2" label="CO₂ (kg per km)">
            <Input
              id="co2"
              value={form.co2_kg_per_km}
              onChange={(e) => set("co2_kg_per_km", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="note" label="Independence note shown to students">
              <Textarea
                id="note"
                rows={3}
                value={form.endorsement_note}
                onChange={(e) => set("endorsement_note", e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between border-t pt-5">
            <Label htmlFor="demo">Demo mode available to students</Label>
            <Switch
              id="demo"
              checked={form.demo_mode_enabled}
              onCheckedChange={(v) => set("demo_mode_enabled", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
