import Stripe from "stripe";

// Single server-side Stripe client, shared by every Stripe-backed feature
// (Identity verification, Connect payouts, Billing subscriptions). Never
// import this from client-side code -- the secret key must never reach
// the browser.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set -- Stripe features are disabled.");
  }
  client = new Stripe(key);
  return client;
}
