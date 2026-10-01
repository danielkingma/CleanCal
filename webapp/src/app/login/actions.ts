"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { registerDeviceAndNotify } from "@/lib/device-session";
import { INVITE_COOKIE } from "@/lib/invite-cookie";

// A cleaner's invite token otherwise lives only in the ?invite= query
// param, carried along by hand through /login -> emailRedirectTo ->
// /auth/callback -> /onboarding. That chain breaks the moment someone
// leaves the actual /login?invite=... tab -- e.g. the Gmail-scanner
// problem below pushes people toward "request a code, then come back
// and type it in," and if "come back" means reopening cleancal.net fresh
// instead of returning to that exact tab, the query param is just gone.
// They land on plain /onboarding, see "create a new business," and
// (reasonably) do that -- which is how a cleaner ends up as the Owner of
// an empty organization of their own instead of joining yours. This
// cookie is a second, more durable place the token lives for a little
// while, so the onboarding/login pages can recover it even when the URL
// itself didn't make the trip.
export interface MagicLinkState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export async function sendMagicLink(
  _prevState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    return { status: "error", message: "Enter an email address." };
  }
  const inviteToken = String(formData.get("invite") || "").trim();
  if (inviteToken) {
    (await cookies()).set(INVITE_COOKIE, inviteToken, {
      maxAge: 60 * 60 * 24, // a day is plenty to finish signing in
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  const supabase = await createClient();
  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  // Without this, a brand-new cleaner clicking an invite link loses the
  // invite token the moment they have to sign in -- /auth/callback
  // defaults to /calendar, which for a user with no organization_id yet
  // just bounces to plain /onboarding (see proxy.ts's ONBOARDING_EXEMPT_
  // PATHS), landing them on "create a new business" instead of joining
  // the one they were invited to. Carrying it through `next` closes that
  // gap for both the emailed link and the typed-in code path below.
  const next = inviteToken ? `/onboarding?invite=${encodeURIComponent(inviteToken)}` : "/calendar";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return {
    status: "sent",
    message: `Check ${email} — tap the link, or enter the sign-in code from that email below.`,
  };
}

// Verifies the numeric code from the same email signInWithOtp sent above.
// This exists alongside the clickable link (handled by /auth/callback)
// because some email providers (Gmail in particular) automatically
// "click" links to scan them for safety before the user ever taps one,
// which silently burns the one-time link. A typed-in code has nothing
// for that scanning to consume.
export async function verifyLoginCode(email: string, code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw new Error(error.message);
  if (data.user) await registerDeviceAndNotify(data.user.id);
}
