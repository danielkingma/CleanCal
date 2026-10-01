"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE } from "@/lib/invite-cookie";

// Both RPCs (create_organization / redeem_invite, see
// 0016_organizations.sql) refuse to run for a user who already has an
// organization -- this is just where that error surfaces to the UI.
export async function createOrganization(name: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { p_name: name });
  if (error) throw new Error(error.message);
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
