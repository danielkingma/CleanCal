"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncOneFeed } from "@/lib/ical-sync";

// All of these rely on Postgres RLS (`properties_admin_write` /
// `ical_feeds_admin_all`) to actually enforce admin-only -- a non-admin
// calling these just gets a permission error back from Supabase.

export async function createProperty(name: string) {
  if (!name.trim()) throw new Error("Give the property a name.");
  const supabase = await createClient();
  const { error } = await supabase.from("properties").insert({ name: name.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
  revalidatePath("/calendar");
}

// Cascades in the database: deleting a property also deletes every
// booking (and each booking's photos) on it -- see the `on delete
// cascade` references in supabase/migrations/0001_init.sql. The
// confirmation prompt lives in the UI (PropertiesAdmin.tsx), not here.
export async function deleteProperty(propertyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
  revalidatePath("/calendar");
}

export async function updateAccessInstructions(propertyId: string, text: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ access_instructions: text })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
  revalidatePath("/calendar");
}

export async function updatePayoutRate(propertyId: string, cents: number | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ payout_rate_cents: cents })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
  revalidatePath("/calendar");
}

export async function addIcalFeed(propertyId: string, sourceLabel: string, icalUrl: string) {
  if (!sourceLabel.trim()) throw new Error("Give this feed a label.");
  try {
    const url = new URL(icalUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    throw new Error("Enter a valid http(s) calendar URL.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ical_feeds")
    .insert({ property_id: propertyId, source_label: sourceLabel.trim(), ical_url: icalUrl.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}

export async function deleteIcalFeed(feedId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ical_feeds").delete().eq("id", feedId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}

export async function syncIcalFeed(feedId: string) {
  const supabase = await createClient();
  const { data: feed, error } = await supabase
    .from("ical_feeds")
    .select("id, property_id, ical_url, source_label")
    .eq("id", feedId)
    .single();
  if (error || !feed) throw new Error(error?.message ?? "Feed not found.");

  await syncOneFeed(supabase, feed);
  revalidatePath("/properties");
  revalidatePath("/calendar");
}

// Rotates a property's export token, invalidating whatever URL any OTA
// currently has on file for it -- enforced by the `regenerate_ical_
// export_token` RPC (0010_ical_export.sql), which checks is_admin()
// itself rather than relying on a table policy.
export async function regenerateExportToken(propertyId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_ical_export_token", {
    p_property_id: propertyId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
  return data as string;
}

export async function syncAllFeeds() {
  const supabase = await createClient();
  const { data: feeds, error } = await supabase
    .from("ical_feeds")
    .select("id, property_id, ical_url, source_label");
  if (error) throw new Error(error.message);

  let failed = 0;
  for (const feed of feeds ?? []) {
    try {
      await syncOneFeed(supabase, feed);
    } catch {
      failed += 1; // recorded on the feed row itself; keep syncing the rest
    }
  }

  revalidatePath("/properties");
  revalidatePath("/calendar");
  return { synced: (feeds ?? []).length, failed };
}
