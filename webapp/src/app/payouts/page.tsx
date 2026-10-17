import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayoutsView, { type BookingOption } from "@/components/PayoutsView";
import { getStatementsAccess } from "@/lib/statements-access";
import { isSuperadmin } from "@/lib/superadmin";
import type { PayoutImport, PayoutLine, Property } from "@/lib/types";

const LINE_COLUMNS =
  "id, import_id, booking_id, property_id, platform, line_type, confirmation_code, guest_name, listing_text, listing_ref, checkin_date, nights, payout_date, amount_cents, currency, match_status";

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function PayoutsPage() {
  const supabase = await createClient();
  const access = await getStatementsAccess(supabase);
  if (!access) redirect("/login");
  if (!access.allowed) redirect("/calendar");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: imports }, { data: openLines }, { data: ignoredLines }, { data: properties }] = await Promise.all([
    supabase
      .from("payout_imports")
      .select("id, platform, file_name, rows_total, rows_imported, rows_matched, rows_duplicate, rows_skipped, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payout_lines")
      .select(LINE_COLUMNS)
      .in("match_status", ["unmatched", "property_only"])
      .order("payout_date", { ascending: false, nullsFirst: false })
      .limit(300),
    supabase
      .from("payout_lines")
      .select(LINE_COLUMNS)
      .eq("match_status", "ignored")
      .order("payout_date", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase.from("properties").select("id, name").order("name"),
  ]);

  // Bookings near the open lines' dates, for the "which booking?" picker.
  const dates = (openLines ?? [])
    .flatMap((l) => [l.checkin_date as string | null, l.payout_date as string | null])
    .filter((d): d is string => Boolean(d))
    .sort();
  let bookingOptions: BookingOption[] = [];
  if (dates.length > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("id, property_id, checkin_date, nights, guests, platform_label")
      .eq("organization_id", access.organizationId)
      .gte("checkin_date", shiftDays(dates[0], -45))
      .lte("checkin_date", shiftDays(dates[dates.length - 1], 14))
      .order("checkin_date");
    bookingOptions = (data ?? []) as BookingOption[];
  }

  return (
    <PayoutsView
      imports={(imports ?? []) as PayoutImport[]}
      openLines={(openLines ?? []) as PayoutLine[]}
      ignoredLines={(ignoredLines ?? []) as PayoutLine[]}
      properties={(properties ?? []) as Property[]}
      bookingOptions={bookingOptions}
      isSuperadmin={isSuperadmin(user?.email)}
    />
  );
}
