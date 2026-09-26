import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarApp from "@/components/CalendarApp";
import { scopeBookingForViewer } from "@/lib/calendar-utils";
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

  // Every org member sees every property -- matches properties_select_own_org
  // RLS (0016), which already allows this.
  const { data: allProperties, error: propertiesError } = await supabase
    .from("properties")
    .select(
      "id, name, access_instructions, payout_rate_cents, bedroom_count, bathroom_count, has_outdoor_area, linen_box_count",
    )
    .order("name");
  const properties = allProperties ?? [];

  // A cleaner now sees the full portfolio schedule too (see
  // bookings_select_own_org in supabase/migrations/0020_cleaner_full_calendar.sql,
  // which permits this at the RLS level for every org member) -- but the
  // guest-facing and cleaner-internal detail on a booking that isn't
  // theirs and isn't open still doesn't belong on their screen, so that's
  // stripped out below before this ever reaches the client.
  const { data: rawBookings } = await supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, status, notes, guests, checklist, assigned_cleaner_id, is_open_job, assignment_confirmed, source, external_uid, ical_missing_since, platform_label, rating, rating_comment, dispute_status, payout_status, stripe_transfer_id, linen_pickup",
    )
    .order("checkin_date");

  const staffUser = isStaff(currentProfile.role);
  const bookings = (rawBookings ?? []).map((b) => scopeBookingForViewer(b as Booking, user.id, staffUser));

  let cleaners: Profile[] = [];
  let cleanerRatings: Record<string, CleanerRating> = {};
  let cleanerUnavailableDates: Record<string, string[]> = {};
  let trialEndsAt: string | null = null;
  if (isStaff(currentProfile.role)) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role, stripe_connect_status")
      .eq("role", "cleaner")
      .order("name");
    cleaners = data ?? [];

    // Staff-only: a cleaner has no reason to see the business's own
    // billing countdown. `organizations_select_own` RLS (0016) already
    // narrows this to exactly the caller's own org row.
    const { data: org } = await supabase.from("organizations").select("trial_ends_at").maybeSingle();
    trialEndsAt = org?.trial_ends_at ?? null;

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
    <div>
      {propertiesError ? (
        <pre
          style={{
            background: "#fee2e2",
            color: "#7f1d1d",
            padding: 16,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          Couldn&apos;t load properties: {propertiesError.message}
        </pre>
      ) : null}
      <CalendarApp
        currentProfile={currentProfile}
        currentUserEmail={user.email ?? ""}
        properties={properties as Property[]}
        initialBookings={(bookings ?? []) as Booking[]}
        cleaners={cleaners}
        cleanerRatings={cleanerRatings}
        cleanerUnavailableDates={cleanerUnavailableDates}
        trialEndsAt={trialEndsAt}
      />
    </div>
  );
}
