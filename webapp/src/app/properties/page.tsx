import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PropertiesAdmin from "@/components/PropertiesAdmin";
import { isStaff, type IcalFeed, type Property } from "@/lib/types";

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
  if (!isStaff(profile?.role)) redirect("/calendar");
  const isOwner = profile?.role === "owner";

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, access_instructions")
    .order("name");

  const { data: feeds } = await supabase
    .from("ical_feeds")
    .select("id, property_id, source_label, ical_url, last_synced_at, last_sync_status, last_sync_error")
    .order("created_at");

  const { data: exportTokens } = await supabase.from("ical_export_tokens").select("property_id, token");
  const exportTokenByPropertyId = Object.fromEntries(
    (exportTokens ?? []).map((row) => [row.property_id, row.token as string]),
  );

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const exportBaseUrl = `${proto}://${host}/api/ical`;

  return (
    <PropertiesAdmin
      properties={(properties ?? []) as Property[]}
      feeds={(feeds ?? []) as IcalFeed[]}
      isOwner={isOwner}
      exportTokenByPropertyId={exportTokenByPropertyId}
      exportBaseUrl={exportBaseUrl}
    />
  );
}
