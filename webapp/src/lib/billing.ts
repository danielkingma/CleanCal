import type Stripe from "stripe";

// Subscription billing: maps an organization's current property count to
// the Stripe Price and quantity its subscription should be on, per the
// published pricing (see LandingPage.tsx's PRICING array and the
// Handbook's pricing table, which this must stay in sync with):
//
//   Any number of properties -- free for 3 months, then a flat
//   $2/property/month. No enterprise cutoff or custom tier -- the same
//   rate applies uncapped.
//
// Every organization gets the same 3-month free period regardless of
// property count -- that's just organizations.trial_ends_at, already set
// uniformly by create_organization() (0039_three_month_trial.sql), not
// anything this file needs to account for.
//
// $2/property is a single plain per-unit Stripe Price -- Stripe multiplies
// it by the quantity passed at checkout, so there's one Price for every
// organization, same as any other per-seat SaaS price.
//
// The Price id lives in an env var (set from the Stripe Dashboard) rather
// than hardcoded here, same reasoning as STRIPE_SECRET_KEY in
// lib/stripe.ts -- it differs between Stripe's test and live modes.
//
// On top of that base plan, an organization can optionally add the Pro
// add-on -- a second, flat $19/month Stripe Price (not per-property),
// added as a second Checkout line item rather than replacing the base
// one. It currently unlocks owner statements; see pro_addon_active in
// 0057_pro_addon.sql and getStatementsAccess() in statements-access.ts.

export interface PropertyPricingTier {
  priceId: string;
  quantity: number;
}

function requirePriceEnv(name: "STRIPE_PRICE_PER_PROPERTY" | "STRIPE_PRICE_PRO_ADDON"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set -- create the Price in Stripe and add its id to the environment.`);
  }
  return value;
}

// propertyCount should always be the organization's real, current
// property count (queried server-side) -- never a value taken from the
// client, since it determines what gets billed.
export function pricingTierForPropertyCount(propertyCount: number): PropertyPricingTier {
  return { priceId: requirePriceEnv("STRIPE_PRICE_PER_PROPERTY"), quantity: propertyCount };
}

// The optional Pro add-on: a second, flat ($19/month, not per-property)
// subscription item that unlocks premium features -- owner statements
// today, possibly more later. Added as a second Checkout line item
// alongside the per-property one, never a replacement for it.
export function proAddonPriceId(): string {
  return requirePriceEnv("STRIPE_PRICE_PRO_ADDON");
}

// Used by the webhook handler to recognize the Pro add-on among a
// subscription's line items without throwing if the env var happens to be
// unset -- a webhook should never crash over a price nobody's configured
// yet, it should just correctly conclude nothing matches.
export function isProAddonPrice(priceId: string): boolean {
  return !!process.env.STRIPE_PRICE_PRO_ADDON && priceId === process.env.STRIPE_PRICE_PRO_ADDON;
}

// organizations.subscription_status only allows ('trialing', 'active',
// 'past_due', 'canceled') -- see 0016_organizations.sql -- which is
// narrower than Stripe's own Subscription.status. The webhook handler
// (src/app/api/webhooks/stripe/route.ts) uses this to fold Stripe's
// states into ours rather than widening the check constraint for states
// CleanCal doesn't otherwise distinguish: incomplete/unpaid behave like
// past_due (payment isn't going through, but the subscription isn't dead
// yet), incomplete_expired/paused behave like canceled (no active plan).
export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "trialing" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "past_due";
  }
}
