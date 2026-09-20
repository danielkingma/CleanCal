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

  const { data: allProperties } = await supabase
    .from("properties")
    .select("id, name, access_instructions")
    .order("name");

  // Admins see every booking; cleaners are scoped to their own assignments
  // (also enforced in Postgres -- see `bookings_select_own_or_admin` in
  // supabase/migrations/0002_photos_and_cleaner_scope.sql -- this filter
  // is just so the calendar doesn't render a bunch of rows a cleaner has
  // nothing to do on).
  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, status, notes, checklist, assigned_cleaner_id, source, external_uid, ical_missing_since",
    )
    .order("checkin_date");
  if (currentProfile.role !== "admin") {
    bookingsQuery = bookingsQuery.eq("assigned_cleaner_id", user.id);
  }
  const { data: bookings } = await bookingsQuery;

  const properties =
    currentProfile.role === "admin"
      ? (allProperties ?? [])
      : (allProperties ?? []).filter((p) =>
          (bookings ?? []).some((b) => b.property_id === p.id),
        );

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
      properties={properties as Property[]}
      initialBookings={(bookings ?? []) as Booking[]}
      cleaners={cleaners}
    />
  );
}
