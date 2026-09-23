"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Self-service only -- enforced by the cleaner_unavailable_* RLS
// policies (supabase/migrations/0012_cleaner_availability.sql), which
// only let a caller touch rows where cleaner_id = auth.uid(). cleaner_id
// is always taken from the session, never trusted from the caller.

export async function markUnavailable(date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("cleaner_unavailable_dates")
    .insert({ cleaner_id: user.id, date });
  if (error) throw new Error(error.message);
  revalidatePath("/availability");
  revalidatePath("/cleaners");
}

export async function markAvailable(date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("cleaner_unavailable_dates")
    .delete()
    .eq("cleaner_id", user.id)
    .eq("date", date);
  if (error) throw new Error(error.message);
  revalidatePath("/availability");
  revalidatePath("/cleaners");
}
