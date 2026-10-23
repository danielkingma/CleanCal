import type Stripe from "stripe";

// Subscription billing: maps an organization's current property count to
// the Stripe Price (and quantity) its subscription should be on, per the
// published tiers (see LandingPage.tsx's PRICING array and the Handbook's
// pricing table, which this must stay in sync with):
//
//   1 property        -- free for 12 months, then $4/month
//   2 - 10 properties  -- free for 3 months, then $4/property/month
//   11 - 100 properties -- $50/month flat
//   101 - 500 properties -- $100/month flat
//   501+ properties     -- custom enterprise pricing (no self-serve Price)
//
// The 1-property and 2-10 tiers bill identically ($4/property/month) --
// they only differ in how long the free period lasts, which is governed
// by organizations.trial_ends_at, not by anything here. So there are only
// two real Stripe Prices for the self-serve range plus one flat tier
// above that, not four.
//
// Price IDs live in env vars (set from the Stripe Dashboard) rather than
// hardcoded here, same reasoning as STRIPE_SECRET_KEY in lib/stripe.ts --
// they differ between Stripe's test and live modes.

export type PropertyPricingTier =
  | { mode: "per_unit"; priceId: string; quantity: number }
  | { mode: "flat"; priceId: string; quantity: 1 }
  | { mode: "enterprise" };

function requirePriceEnv(name: "STRIPE_PRICE_PER_PROPERTY" | "STRIPE_PRICE_TIER_11_100" | "STRIPE_PRICE_TIER_101_500"): string {
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
  if (propertyCount <= 10) {
    // Covers both the 1-property and 2-10 tiers: same per-unit rate,
    // just a different free period (trial_ends_at), not a different Price.
    return { mode: "per_unit", priceId: requirePriceEnv("STRIPE_PRICE_PER_PROPERTY"), quantity: propertyCount };
  }
  if (propertyCount <= 100) {
    return { mode: "flat", priceId: requirePriceEnv("STRIPE_PRICE_TIER_11_100"), quantity: 1 };
  }
  if (propertyCount <= 500) {
    return { mode: "flat", priceId: requirePriceEnv("STRIPE_PRICE_TIER_101_500"), quantity: 1 };
  }
  return { mode: "enterprise" };
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
