"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Deliberately takes no `role` param -- the update_own_profile RPC only
// ever touches name/bio/phone/service_area for the caller's own row, so
// there's no path here for a user to change their own role.
export async function updateOwnProfile(name: string, bio: string, phone: string, serviceArea: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_profile", {
    p_name: name,
    p_bio: bio,
    p_phone: phone,
    p_service_area: serviceArea,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath("/cleaners");
}
