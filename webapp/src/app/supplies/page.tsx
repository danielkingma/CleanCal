import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SuppliesView from "@/components/SuppliesView";
import { isStaff, type Property, type SupplyItem } from "@/lib/types";

export default async function SuppliesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const staffUser = isStaff(profile?.role);

  // RLS (supply_items_select_own_org) already scopes this to the
  // signed-in user's organization -- everyone in the org can see the
  // full list, same reasoning as maintenance's work orders: a cleaner
  // needs to know what's already low before they show up.
  const { data: items } = await supabase
    .from("supply_items")
    .select("id, property_id, name, unit, quantity, low_threshold, last_restocked_at")
    .order("name");

  const { data: properties } = await supabase.from("properties").select("id, name").order("name");

  return (
    <SuppliesView
      isStaffUser={staffUser}
      items={(items ?? []) as SupplyItem[]}
      properties={(properties ?? []) as Property[]}
    />
  );
}
