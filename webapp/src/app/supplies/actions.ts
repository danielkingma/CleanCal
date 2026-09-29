"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";

export interface SupplyItemInput {
  property_id: string;
  name: string;
  unit: string;
  quantity: number;
  low_threshold: number;
}

// Staff-only (enforced by supply_items_staff_write RLS, 0038_supply_inventory.sql).
export async function createSupplyItem(input: SupplyItemInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("supply_items").insert({ ...input, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
  revalidatePath("/supplies");
}

export async function deleteSupplyItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("supply_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/supplies");
}

// Staff restocking an item -- sets the quantity back up and stamps
// last_restocked_at, rather than the incremental reportSupplyUsage path
// below (which only ever goes down, and is the one a cleaner can call).
export async function restockSupplyItem(id: string, quantity: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("supply_items")
    .update({ quantity, last_restocked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/supplies");
}

// The cleaner's own path -- only ever able to use some up, via the
// report_supply_usage RPC (0038_supply_inventory.sql), which clamps at
// zero and can't touch anything but quantity. Staff can call this too
// (e.g. logging usage without a full restock), same RPC either way.
// Best-effort: if the item just crossed into low stock, tells staff.
export async function reportSupplyUsage(id: string, used: number = 1) {
  const supabase = await createClient();
  const { data: item, error } = await supabase.rpc("report_supply_usage", { p_id: id, p_used: used });
  if (error) throw new Error(error.message);
  revalidatePath("/supplies");

  if (item && item.quantity <= item.low_threshold) {
    try {
      const { data: property } = await supabase
        .from("properties")
        .select("name")
        .eq("id", item.property_id)
        .maybeSingle();
      const { data: staffProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", item.organization_id)
        .in("role", ["owner", "manager"]);
      const staffIds = (staffProfiles ?? []).map((p) => p.id as string);
      if (staffIds.length > 0) {
        await notifyUsers(staffIds, {
          title: "Supply running low",
          body: `${property?.name ?? "A property"} — ${item.name} (${item.quantity} ${item.unit} left)`,
          url: "/supplies",
        });
      }
    } catch {
      // Best-effort -- the usage report itself already succeeded above.
    }
  }
}
