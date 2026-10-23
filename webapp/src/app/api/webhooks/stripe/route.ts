import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { isProAddonPrice, mapStripeSubscriptionStatus } from "@/lib/billing";
import { createServiceClient } from "@/lib/supabase/service";

// Single endpoint for every Stripe-backed feature (Identity today;
// Connect and Billing events land here too as they're added) -- Stripe
// itself has no user session to authenticate with, so signature
// verification against STRIPE_WEBHOOK_SECRET is what stands in for auth,
// same role CRON_SECRET plays on /api/cron/sync-ical. Writes always go
// through the service-role client: there's no signed-in user to scope
// RLS to, and the whole point is updating rows a plain user session
// couldn't write anyway (see start_own_identity_verification's comment
// in 0014_identity_verification.sql).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Recomputed fresh from a subscription's actual line items every time --
  // never toggled by hand, never assumed to still hold from a prior event.
  // See pro_addon_active's comment in 0057_pro_addon.sql for why this is a
  // separate column from the hand-toggled statements_enabled rather than
  // something that could ever clobber it.
  function hasProAddonItem(subscription: Stripe.Subscription): boolean {
    return subscription.items.data.some((item) => isProAddonPrice(item.price.id));
  }

  switch (event.type) {
    case "identity.verification_session.verified": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      await supabase
        .from("profiles")
        .update({ identity_status: "verified" })
        .eq("stripe_identity_session_id", session.id);
      break;
    }
    case "identity.verification_session.requires_input": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      await supabase
        .from("profiles")
        .update({ identity_status: "failed" })
        .eq("stripe_identity_session_id", session.id);
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      // payouts_enabled is the actual signal Connect onboarding is
      // complete -- charges_enabled alone doesn't mean Stripe has
      // verified enough to pay this account out yet.
      await supabase
        .from("profiles")
        .update({ stripe_connect_status: account.payouts_enabled ? "active" : "pending" })
        .eq("stripe_connect_account_id", account.id);
      break;
    }
    // Subscription billing (see src/lib/billing.ts and
    // startBillingCheckout in src/app/profile/actions.ts). Checkout only
    // ever creates the Customer + Checkout Session -- the subscription
    // itself, and every status change after that (renewal, a failed
    // card, cancellation), only ever reaches our data through these
    // three events. organizations has no generic write policy (same as
    // profiles.stripe_connect_status), so this -- the service-role
    // client -- is the only writer of stripe_subscription_id and
    // subscription_status from here on.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription || !session.customer) break;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await supabase
        .from("organizations")
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: mapStripeSubscriptionStatus(subscription.status),
          pro_addon_active: hasProAddonItem(subscription),
        })
        .eq("stripe_customer_id", typeof session.customer === "string" ? session.customer : session.customer.id);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("organizations")
        .update({
          subscription_status: mapStripeSubscriptionStatus(subscription.status),
          pro_addon_active: hasProAddonItem(subscription),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("organizations")
        .update({ subscription_status: "canceled", pro_addon_active: false })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
