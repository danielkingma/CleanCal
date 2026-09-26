import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const params = await searchParams;
  const rawInvite = params.invite;
  const inviteToken = typeof rawInvite === "string" ? rawInvite : null;

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
