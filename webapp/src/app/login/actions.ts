"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return {
    status: "sent",
    message: `Check ${email} — tap the link, or enter the 6-digit code from that email below.`,
  };
}

// Verifies the 6-digit code from the same email signInWithOtp sent above.
// This exists alongside the clickable link (handled by /auth/callback)
// because some email providers (Gmail in particular) automatically
// "click" links to scan them for safety before the user ever taps one,
// which silently burns the one-time link. A typed-in code has nothing
// for that scanning to consume.
export async function verifyLoginCode(email: string, code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw new Error(error.message);
}
