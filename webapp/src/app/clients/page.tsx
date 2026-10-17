import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientsView from "@/components/ClientsView";
import { getStatementsAccess } from "@/lib/statements-access";
import { isSuperadmin } from "@/lib/superadmin";
import type { Property, PropertyFinancials, PropertyOwner } from "@/lib/types";

export default async function ClientsPage() {
  const supabase = await createClient();
  const access = await getStatementsAccess(supabase);
  if (!access) redirect("/login");
  if (!access.allowed) redirect("/calendar");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: owners }, { data: properties }, { data: financials }] = await Promise.all([
    supabase.from("property_owners").select("id, name, email, phone, notes").order("name"),
    supabase.from("properties").select("id, name, payout_rate_cents, linen_fee_cents").order("name"),
    supabase
      .from("property_financials")
      .select(
        "property_id, property_owner_id, mgmt_fee_percent, fee_basis, owner_cleaning_charge_cents, airbnb_listing_name, booking_com_property_id",
      ),
  ]);

  return (
    <ClientsView
      owners={(owners ?? []) as PropertyOwner[]}
      properties={(properties ?? []) as Property[]}
      financials={((financials ?? []) as PropertyFinancials[]).map((f) => ({
        ...f,
        mgmt_fee_percent: Number(f.mgmt_fee_percent),
      }))}
      isSuperadmin={isSuperadmin(user?.email)}
    />
  );
}
