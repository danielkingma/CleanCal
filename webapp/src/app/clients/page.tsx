import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientsView from "@/components/ClientsView";
import { getStatementsAccess } from "@/lib/statements-access";
import { isSuperadmin } from "@/lib/superadmin";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { PlatformListing, Property, PropertyFinancials, PropertyOwner } from "@/lib/types";

export default async function ClientsPage() {
  const supabase = await createClient();
  const access = await getStatementsAccess(supabase);
  if (!access) redirect("/login");
  if (!access.allowed) redirect("/calendar");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: owners }, { data: properties }, { data: financials }, { data: listings }, { data: feeds }] =
    await Promise.all([
      supabase.from("property_owners").select("id, name, email, phone, notes").order("name"),
      supabase.from("properties").select("id, name, payout_rate_cents, linen_fee_cents").order("name"),
      supabase
        .from("property_financials")
        .select("property_id, property_owner_id, mgmt_fee_percent, fee_basis, owner_cleaning_charge_cents"),
      supabase.from("property_platform_listings").select("id, property_id, platform, identifier").order("created_at"),
      // Which platforms each property's calendar feeds come from, to
      // suggest the listings it's likely to need.
      supabase.from("ical_feeds").select("property_id, source_label"),
    ]);

  // De-duplicated "property is on platform X" pairs from its calendar feeds.
  const seen = new Set<string>();
  const feedPlatforms: { property_id: string; platform: string }[] = [];
  for (const f of feeds ?? []) {
    const platform = getPlatformBadge(f.source_label as string)?.name;
    const key = `${f.property_id}|${platform}`;
    if (!platform || seen.has(key)) continue;
    seen.add(key);
    feedPlatforms.push({ property_id: f.property_id as string, platform });
  }

  return (
    <ClientsView
      owners={(owners ?? []) as PropertyOwner[]}
      properties={(properties ?? []) as Property[]}
      financials={((financials ?? []) as PropertyFinancials[]).map((f) => ({
        ...f,
        mgmt_fee_percent: Number(f.mgmt_fee_percent),
      }))}
      listings={(listings ?? []) as PlatformListing[]}
      feedPlatforms={feedPlatforms}
      isSuperadmin={isSuperadmin(user?.email)}
    />
  );
}
