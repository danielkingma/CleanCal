import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIcs } from "./ical";
import { daysBetween, fromISO } from "./calendar-utils";

interface FeedRow {
  id: string;
  property_id: string;
  ical_url: string;
}

// Shared by the admin-triggered server action (cookie-scoped client, RLS
// applies -- caller must be an admin) and the Vercel Cron route handler
// (service-role client, RLS bypassed since there's no signed-in user).
export async function syncOneFeed(supabase: SupabaseClient, feed: FeedRow): Promise<void> {
  try {
    let url: URL;
    try {
      url = new URL(feed.ical_url);
    } catch {
      throw new Error("Feed URL is not a valid URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Feed URL must be http(s).");
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
    const raw = await res.text();
    const events = parseIcs(raw).filter((e) => e.startDate < e.endDate);

    if (events.length > 0) {
      const rows = events.map((e) => ({
        property_id: feed.property_id,
        external_uid: e.uid,
        checkin_date: e.startDate,
        nights: daysBetween(fromISO(e.startDate), fromISO(e.endDate)),
        source: "ical" as const,
      }));
      const { error: upsertError } = await supabase
        .from("bookings")
        .upsert(rows, { onConflict: "property_id,external_uid" });
      if (upsertError) throw new Error(upsertError.message);
    }

    // A UID previously imported from this feed that's no longer present
    // may mean the guest cancelled -- flag it rather than deleting, so an
    // admin can confirm before losing any cleaning progress on it. If a
    // flagged one reappears, un-flag it.
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, external_uid, ical_missing_since")
      .eq("property_id", feed.property_id)
      .eq("source", "ical");

    const seen = new Set(events.map((e) => e.uid));
    const nowMissing = (existing ?? [])
      .filter((b) => b.external_uid && !seen.has(b.external_uid) && !b.ical_missing_since)
      .map((b) => b.id);
    const noLongerMissing = (existing ?? [])
      .filter((b) => b.external_uid && seen.has(b.external_uid) && b.ical_missing_since)
      .map((b) => b.id);

    if (nowMissing.length > 0) {
      await supabase
        .from("bookings")
        .update({ ical_missing_since: new Date().toISOString() })
        .in("id", nowMissing);
    }
    if (noLongerMissing.length > 0) {
      await supabase.from("bookings").update({ ical_missing_since: null }).in("id", noLongerMissing);
    }

    await supabase
      .from("ical_feeds")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "ok", last_sync_error: null })
      .eq("id", feed.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await supabase
      .from("ical_feeds")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "error", last_sync_error: message })
      .eq("id", feed.id);
    throw e instanceof Error ? e : new Error(message);
  }
}
