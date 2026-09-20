import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarApp from "@/components/CalendarApp";
import type { Booking, CleanerRating, Profile, Property } from "@/lib/types";

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
      "id, property_id, checkin_date, nights, status, notes, guests, checklist, assigned_cleaner_id, source, external_uid, ical_missing_since, platform_label, rating, rating_comment",
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
  let cleanerRatings: Record<string, CleanerRating> = {};
  if (currentProfile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("role", "cleaner")
      .order("name");
    cleaners = data ?? [];

    const { data: ratedBookings } = await supabase
      .from("bookings")
      .select("assigned_cleaner_id, rating")
      .not("rating", "is", null);
    const totals = new Map<string, { total: number; count: number }>();
    for (const b of ratedBookings ?? []) {
      if (!b.assigned_cleaner_id || b.rating == null) continue;
      const entry = totals.get(b.assigned_cleaner_id) ?? { total: 0, count: 0 };
      entry.total += b.rating;
      entry.count += 1;
      totals.set(b.assigned_cleaner_id, entry);
    }
    cleanerRatings = Object.fromEntries(
      Array.from(totals.entries()).map(([id, { total, count }]) => [
        id,
        { average: total / count, count },
      ]),
    );
  }

  return (
    <CalendarApp
      currentProfile={currentProfile}
      currentUserEmail={user.email ?? ""}
      properties={properties as Property[]}
      initialBookings={(bookings ?? []) as Booking[]}
      cleaners={cleaners}
      cleanerRatings={cleanerRatings}
    />
  );
}
