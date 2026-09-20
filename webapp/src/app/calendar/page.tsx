import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarApp from "@/components/CalendarApp";
import type { Booking, Profile, Property } from "@/lib/types";

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  const currentProfile: Profile = profile ?? {
    id: user.id,
    name: user.email?.split("@")[0] ?? "You",
    role: "cleaner",
  };

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, status, notes, checklist, assigned_cleaner_id",
    )
    .order("checkin_date");

  let cleaners: Profile[] = [];
  if (currentProfile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("role", "cleaner")
      .order("name");
    cleaners = data ?? [];
  }

  return (
    <CalendarApp
      currentProfile={currentProfile}
      currentUserEmail={user.email ?? ""}
      properties={(properties ?? []) as Property[]}
      initialBookings={(bookings ?? []) as Booking[]}
      cleaners={cleaners}
    />
  );
}
