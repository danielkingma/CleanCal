"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Deliberately takes no `role` param -- the update_own_profile RPC only
// ever touches given_name/middle_name/surname/bio/phone/service_area/
// sms_opt_in/favorite_color for the caller's own row (name and
// preferred_initial are derived from the name parts server-side), so
// there's no path here for a user to change their own role.
export async function updateOwnProfile(
  givenName: string,
  middleName: string,
  surname: string,
  bio: string,
  phone: string,
  serviceArea: string,
  smsOptIn: boolean,
  favoriteColor: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_profile", {
    p_given_name: givenName,
    p_middle_name: middleName,
    p_surname: surname,
    p_bio: bio,
    p_phone: phone,
    p_service_area: serviceArea,
    p_sms_opt_in: smsOptIn,
    p_favorite_color: favoriteColor,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath("/cleaners");
}

// Owner-only (enforced in update_organization_name() itself, not just
// hidden in the UI) -- see 0036_signup_asks_for_name_not_business.sql.
// Signing up no longer asks for a business name up front, so this is how
// an Owner sets or changes it afterward.
export async function updateOrganizationName(name: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization_name", { p_name: name });
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
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

// Starts (or resumes) Stripe Connect Express onboarding for the
// signed-in cleaner and returns the URL to redirect them to. Reuses an
// existing account if onboarding was already started rather than
// creating a new Express account every time this is called -- Stripe
// treats a fresh account per attempt as a real (and confusing) separate
// payee. Whether the account can actually receive a payout
// (`stripe_connect_status = 'active'`) is set only by the
// `account.updated` webhook, once Stripe confirms onboarding is done.
export async function startConnectOnboarding(returnUrl: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  let accountId = profile?.stripe_connect_account_id as string | null | undefined;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    const { error } = await supabase.rpc("start_own_connect_onboarding", {
      p_account_id: accountId,
    });
    if (error) throw new Error(error.message);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  revalidatePath("/profile");
  return link.url;
}
