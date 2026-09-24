"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

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

// Starts a Stripe-hosted ID verification session for the signed-in
// cleaner and returns the URL to redirect them to. The *result* of
// verification only ever comes back through the Stripe webhook
// (src/app/api/webhooks/stripe/route.ts) -- this action just records
// that a session was started, so the UI can show "pending" in the
// meantime.
export async function startIdentityVerification(returnUrl: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { supabase_user_id: user.id },
    return_url: returnUrl,
  });
  if (!session.url) throw new Error("Stripe didn't return a verification URL.");

  const { error } = await supabase.rpc("start_own_identity_verification", {
    p_session_id: session.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  return session.url;
}
