import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildIcsFeed } from "@/lib/ical-export";

// Public, unauthenticated by design -- an OTA's calendar importer can't
// log in, so the token in the URL (unguessable, regenerable) is what
// stands in for auth instead, same pattern as CRON_SECRET on the sync
// route. Uses the service-role client for the same reason: no user
// session to scope a request to.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("ical_export_tokens")
    .select("property_id")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", tokenRow.property_id)
    .maybeSingle();
  if (!property) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Every booking regardless of source -- an Airbnb-imported reservation
  // needs to show up in the feed handed back to Vrbo, and vice versa, or
  // this doesn't actually prevent a double-booking. Bookings flagged
  // `ical_missing_since` are skipped: the guest may have cancelled, so
  // blocking those dates elsewhere would be wrong until an admin confirms.
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, checkin_date, nights")
    .eq("property_id", property.id)
    .is("ical_missing_since", null);

  const feed = buildIcsFeed(property.name, bookings ?? []);

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${property.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
