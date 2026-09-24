import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
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
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
