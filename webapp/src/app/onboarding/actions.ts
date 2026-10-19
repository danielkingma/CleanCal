"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE } from "@/lib/invite-cookie";
import { REFERRAL_COOKIE, normaliseReferralCode } from "@/lib/referral";

// Both RPCs (create_organization / redeem_invite, see
// 0016_organizations.sql) refuse to run for a user who already has an
// organization -- this is just where that error surfaces to the UI.
//
// `name` is the person's own name. `businessName` is optional: given, the
// account is named after the business or company; left out, it's named
// after the person (an individual signing up for themselves).
export async function createOrganization(name: string, businessName?: string) {
  const supabase = await createClient();
  const business = businessName?.trim();
  const { error } = await supabase.rpc(
    "create_organization",
    business ? { p_name: name, p_business_name: business } : { p_name: name },
  );
  if (error) throw new Error(error.message);

  // Came from a referral link? Record it. Best effort: a failure here (or
  // a code that doesn't check out) must never stop the signup itself.
  const jar = await cookies();
  const code = normaliseReferralCode(jar.get(REFERRAL_COOKIE)?.value);
  if (code) {
    try {
      await supabase.rpc("record_referral", { p_code: code });
    } catch {
      // ignored on purpose
    }
    jar.delete(REFERRAL_COOKIE);
  }
  revalidatePath("/", "layout");
}

export async function redeemInvite(token: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invite", { p_token: token, p_name: name });
  if (error) throw new Error(error.message);
  // Done with it -- clears the fallback cookie (see login/actions.ts's
  // sendMagicLink) so a later sign-in on the same browser never resurfaces
  // an already-used invite.
  (await cookies()).delete(INVITE_COOKIE);
  revalidatePath("/", "layout");
}

// Also lets someone bail out of a wrongly-recovered invite (the cookie
// fallback guessed wrong, or they genuinely want to start their own
// business instead) without it following them around for the rest of the
// day -- OnboardingForm's "create a new business instead" path uses this.
export async function forgetInviteToken() {
  (await cookies()).delete(INVITE_COOKIE);
}
