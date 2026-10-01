import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";
import { readInviteCookie } from "@/lib/invite-cookie";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const params = await searchParams;
  const rawInvite = params.invite;
  // Same URL-first, cookie-fallback reasoning as /login (see
  // login/actions.ts's sendMagicLink) -- this is what actually closes the
  // gap: /auth/callback's own fallback redirect already preserves the URL
  // param when it has one, but a user who verified via the typed-in code
  // (verifyLoginCode) can land here with no query string survived from
  // anywhere, having only ever had the token in that cookie.
  const inviteToken = typeof rawInvite === "string" ? rawInvite : await readInviteCookie();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Preserves the invite token on this fallback redirect too -- normally
  // proxy.ts already sends a signed-out visitor to /login?invite=... before
  // this page even runs, but if that ever races with a not-yet-propagated
  // session cookie, dropping the invite here would be the same
  // lost-invite bug as the one in auth/callback/route.ts.
  if (!user) redirect(inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : "/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.organization_id) redirect("/calendar");

  // A not-yet-onboarded user can't read organization_invites directly
  // under its own RLS (see preview_invite's comment in
  // 0016_organizations.sql) -- this narrow RPC is the only way to show
  // which business they're about to join before they confirm.
  let inviteOrgName: string | null = null;
  if (inviteToken) {
    const { data } = await supabase.rpc("preview_invite", { p_token: inviteToken });
    inviteOrgName = (data as string | null) ?? null;
  }

  return <OnboardingForm inviteToken={inviteToken} inviteOrgName={inviteOrgName} />;
}
