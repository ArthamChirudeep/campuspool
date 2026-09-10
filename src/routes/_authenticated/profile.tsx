import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAreas } from "@/components/ride";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — CampusPool @ CVR" },
      {
        name: "description",
        content: "Update your department, home area and vehicle details for better ride matches.",
      },
      { property: "og:title", content: "My profile — CampusPool @ CVR" },
      { property: "og:description", content: "Your commuter and vehicle details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: areas } = useAreas();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    full_name: "",
    department: "",
    study_year: "",
    home_area: "",
    phone: "",
    bio: "",
    is_driver: false,
    vehicle_model: "",
    vehicle_color: "",
    vehicle_plate: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      department: profile.department ?? "",
      study_year: profile.study_year ? String(profile.study_year) : "",
      home_area: profile.home_area ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      is_driver: profile.is_driver,
      vehicle_model: profile.vehicle_model ?? "",
      vehicle_color: profile.vehicle_color ?? "",
      vehicle_plate: profile.vehicle_plate ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          department: form.department || null,
          study_year: form.study_year ? Number(form.study_year) : null,
          home_area: form.home_area || null,
          phone: form.phone || null,
          bio: form.bio || null,
          is_driver: form.is_driver,
          vehicle_model: form.vehicle_model || null,
          vehicle_color: form.vehicle_color || null,
          vehicle_plate: form.vehicle_plate || null,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Better details mean better matches for you and your classmates.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Full name" id="full_name">
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </Field>
          <Field label="Department" id="department">
            <Input
              id="department"
              placeholder="CSE, ECE, Mechanical…"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            />
          </Field>
          <Field label="Year of study" id="year">
            <Input
              id="year"
              type="number"
              min={1}
              max={4}
              value={form.study_year}
              onChange={(e) => set("study_year", e.target.value)}
            />
          </Field>
          <Field label="Home area" id="home_area">
            <Input
              id="home_area"
              list="area-list"
              value={form.home_area}
              onChange={(e) => set("home_area", e.target.value)}
            />
            <datalist id="area-list">
              {(areas ?? []).map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Phone" id="phone">
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="About you" id="bio">
              <Textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
            </Field>
          </div>

          <div className="sm:col-span-2 flex items-center gap-2 border-t pt-5">
            <Checkbox
              id="driver"
              checked={form.is_driver}
              onCheckedChange={(v) => set("is_driver", Boolean(v))}
            />
            <Label htmlFor="driver">I drive and can offer seats</Label>
          </div>

          {form.is_driver && (
            <>
              <Field label="Vehicle model" id="model">
                <Input
                  id="model"
                  placeholder="Maruti Swift"
                  value={form.vehicle_model}
                  onChange={(e) => set("vehicle_model", e.target.value)}
                />
              </Field>
              <Field label="Colour" id="colour">
                <Input
                  id="colour"
                  value={form.vehicle_color}
                  onChange={(e) => set("vehicle_color", e.target.value)}
                />
              </Field>
              <Field label="Number plate" id="plate">
                <Input
                  id="plate"
                  placeholder="TS 09 AB 1234"
                  value={form.vehicle_plate}
                  onChange={(e) => set("vehicle_plate", e.target.value)}
                />
              </Field>
            </>
          )}

          <div className="sm:col-span-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
