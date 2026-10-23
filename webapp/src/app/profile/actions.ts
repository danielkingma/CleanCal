"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { pricingTierForPropertyCount } from "@/lib/billing";

// Deliberately takes no `role` param -- the update_own_profile RPC only
// ever touches given_name/middle_name/surname/bio/phone/service_area/
// sms_opt_in/favorite_color/address for the caller's own row (name and
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
  address: string,
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
    p_address: address,
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

// Owner-or-manager (enforced in update_dispatcher_enabled() itself --
// see 0054_turnover_dispatcher.sql) -- the on/off switch for the
// turnover dispatcher (src/lib/dispatcher.ts, src/lib/ical-sync.ts).
// Off by default; this is the only way to turn it on, there's no
// superadmin-only backdoor like owner statements has.
export async function updateDispatcherEnabled(enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_dispatcher_enabled", { p_enabled: enabled });
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

// Owner-only, same reasoning as updateOrganizationName -- but unlike that
// one, there's no RPC enforcing the role for the read-only lookups below
// (organizations_select_own and profiles_select_own_or_admin let any org
// member read this data), so the check happens here, same shape as
// cleaners/actions.ts's delete-cleaner guard. The one write this makes
// (start_own_organization_billing, to record a newly-created Stripe
// customer) *is* RPC-enforced, belt and suspenders.
//
// Starts (or resumes) a Stripe Checkout subscription for the signed-in
// owner's organization, priced for its current property count (see
// lib/billing.ts for the tier math) and returns the URL to redirect them
// to. The subscription doesn't actually take effect in our own data until
// the checkout.session.completed webhook fires -- this only ever creates
// a Stripe Customer (reused on every later call) and a Checkout Session.
export async function startBillingCheckout(returnUrl: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) throw new Error("No organization found.");
  if (profile.role !== "owner") throw new Error("Only the organization owner can manage billing.");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, stripe_customer_id")
    .eq("id", profile.organization_id)
    .single();
  if (!org) throw new Error("No organization found.");

  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);
  const propertyCount = count ?? 0;
  if (propertyCount === 0) throw new Error("Add at least one property before subscribing.");

  const tier = pricingTierForPropertyCount(propertyCount);
  if (tier.mode === "enterprise") {
    throw new Error(
      "501+ properties is custom enterprise pricing -- contact support@cleancal.net instead of self-serve checkout.",
    );
  }

  const stripe = getStripe();
  let customerId = org.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { organization_id: org.id },
    });
    customerId = customer.id;
    const { error } = await supabase.rpc("start_own_organization_billing", { p_customer_id: customerId });
    if (error) throw new Error(error.message);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: tier.priceId, quantity: tier.quantity }],
    success_url: returnUrl,
    cancel_url: returnUrl,
    subscription_data: { metadata: { organization_id: org.id } },
  });
  if (!session.url) throw new Error("Stripe didn't return a checkout URL.");

  revalidatePath("/profile");
  return session.url;
}

// Owner-only (see startBillingCheckout above for why the check lives
// here). Opens Stripe's hosted Billing Portal for the organization's
// existing subscription -- update payment method, change plan, view
// invoices, cancel. Requires a Stripe customer to already exist, i.e. the
// owner has been through startBillingCheckout at least once.
export async function openBillingPortal(returnUrl: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) throw new Error("No organization found.");
  if (profile.role !== "owner") throw new Error("Only the organization owner can manage billing.");

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", profile.organization_id)
    .single();
  if (!org?.stripe_customer_id) throw new Error("No billing account yet -- subscribe first.");

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: returnUrl,
  });
  return session.url;
}
