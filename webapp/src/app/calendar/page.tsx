import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarApp from "@/components/CalendarApp";
import { isStaff, type Booking, type CleanerRating, type Profile, type Property } from "@/lib/types";

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
    .select("id, name, access_instructions, payout_rate_cents")
    .order("name");

  // Admins see every booking; cleaners are scoped to their own assignments
  // plus any open, unclaimed job (also enforced in Postgres -- see
  // `bookings_select_own_open_or_admin` in
  // supabase/migrations/0007_open_job_board.sql -- this filter is just so
  // the calendar doesn't render a bunch of rows a cleaner has nothing to
  // do on).
  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, status, notes, guests, checklist, assigned_cleaner_id, is_open_job, source, external_uid, ical_missing_since, platform_label, rating, rating_comment, dispute_status, payout_status, stripe_transfer_id",
    )
    .order("checkin_date");
  if (!isStaff(currentProfile.role)) {
    bookingsQuery = bookingsQuery.or(
      `assigned_cleaner_id.eq.${user.id},and(is_open_job.eq.true,assigned_cleaner_id.is.null)`,
    );
  }
  const { data: bookings } = await bookingsQuery;

  const properties =
    isStaff(currentProfile.role)
      ? (allProperties ?? [])
      : (allProperties ?? []).filter((p) =>
          (bookings ?? []).some((b) => b.property_id === p.id),
        );

  let cleaners: Profile[] = [];
  let cleanerRatings: Record<string, CleanerRating> = {};
  let cleanerUnavailableDates: Record<string, string[]> = {};
  if (isStaff(currentProfile.role)) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role, stripe_connect_status")
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

    const { data: unavailableRows } = await supabase
      .from("cleaner_unavailable_dates")
      .select("cleaner_id, date");
    const unavailableMap = new Map<string, string[]>();
    for (const row of unavailableRows ?? []) {
      const list = unavailableMap.get(row.cleaner_id) ?? [];
      list.push(row.date);
      unavailableMap.set(row.cleaner_id, list);
    }
    cleanerUnavailableDates = Object.fromEntries(unavailableMap);
  }

  return (
    <CalendarApp
      currentProfile={currentProfile}
      currentUserEmail={user.email ?? ""}
      properties={properties as Property[]}
      initialBookings={(bookings ?? []) as Booking[]}
      cleaners={cleaners}
      cleanerRatings={cleanerRatings}
      cleanerUnavailableDates={cleanerUnavailableDates}
    />
  );
}
