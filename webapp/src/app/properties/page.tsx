import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PropertiesAdmin from "@/components/PropertiesAdmin";
import type { IcalFeed, Property } from "@/lib/types";

export default async function PropertiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/calendar");

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, access_instructions")
    .order("name");

  const { data: feeds } = await supabase
    .from("ical_feeds")
    .select("id, property_id, source_label, ical_url, last_synced_at, last_sync_status, last_sync_error")
    .order("created_at");

  return (
    <PropertiesAdmin
      properties={(properties ?? []) as Property[]}
      feeds={(feeds ?? []) as IcalFeed[]}
    />
  );
}
