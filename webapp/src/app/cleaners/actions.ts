"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

// Owner-only in practice -- enforced by the `profiles_owner_write` RLS
// policy (supabase/migrations/0009_owner_manager_roles.sql), which lets
// only an owner write to a profile row that isn't their own. The
// self-role check here is just a friendlier error message; RLS is what
// actually stops it (and stops a non-owner from getting here at all).
export async function updateUserRole(userId: string, newRole: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) throw new Error("You can't change your own role.");

  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/cleaners");
  revalidatePath("/calendar");
}

// Generates a one-time invite link for someone to join this organization.
// Enforcement lives in `organization_invites_insert_staff` RLS
// (0016_organizations.sql): a Manager can only invite at the cleaner
// role, only an Owner can invite Owner/Manager -- same boundary as
// changing an existing member's role.
export async function createInvite(role: Role): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) throw new Error("No organization found.");

  const { data, error } = await supabase
    .from("organization_invites")
    .insert({ organization_id: profile.organization_id, role, created_by: user.id })
    .select("token")
    .single();
  if (error) throw new Error(error.message);
  return data.token as string;
}
