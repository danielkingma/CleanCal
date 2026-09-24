import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.organization_id) redirect("/calendar");

  const params = await searchParams;
  const rawInvite = params.invite;
  const inviteToken = typeof rawInvite === "string" ? rawInvite : null;

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
