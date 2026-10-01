import { cookies } from "next/headers";

// Shared with login/actions.ts (which sets this) and the /login and
// /onboarding pages (which fall back to reading it) -- see the comment
// on sendMagicLink in login/actions.ts for why this exists at all. Kept
// in its own plain module rather than login/actions.ts because a
// "use server" file can only export async actions, not a constant.
export const INVITE_COOKIE = "cleancal_invite";

export async function readInviteCookie(): Promise<string | null> {
  return (await cookies()).get(INVITE_COOKIE)?.value ?? null;
}
