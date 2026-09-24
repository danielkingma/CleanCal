"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Both RPCs (create_organization / redeem_invite, see
// 0016_organizations.sql) refuse to run for a user who already has an
// organization -- this is just where that error surfaces to the UI.
export async function createOrganization(name: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { p_name: name });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function redeemInvite(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invite", { p_token: token });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
