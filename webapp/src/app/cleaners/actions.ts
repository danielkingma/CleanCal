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
