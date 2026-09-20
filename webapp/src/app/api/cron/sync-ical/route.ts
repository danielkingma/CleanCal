import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncOneFeed } from "@/lib/ical-sync";

// An external scheduler (e.g. cron-job.org) hits this on a schedule with
// an `Authorization: Bearer <CRON_SECRET>` header -- see webapp/README.md
// for setup. (Vercel's own Cron Jobs would work too, but Hobby-plan
// accounts are limited to once daily, too infrequent for this.) This
// route is unauthenticated by user session, so it uses the service-role
// client -- CRON_SECRET is what stands in for auth here, so it must
// actually be set in production.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; auto-sync is disabled." },
      { status: 501 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: feeds, error } = await supabase
    .from("ical_feeds")
    .select("id, property_id, ical_url, source_label");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.allSettled((feeds ?? []).map((feed) => syncOneFeed(supabase, feed)));
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ synced: results.length, failed });
}
