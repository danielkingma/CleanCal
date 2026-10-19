import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InviteLink from "@/components/InviteLink";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import NavMenus from "@/components/NavMenus";
import { isStaff } from "@/lib/types";
import { isSuperadmin } from "@/lib/superadmin";

// Invite someone to the team. Used to sit at the top of the Cleaners page;
// it has its own page (and a Menu link) now.
export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!isStaff(profile?.role)) redirect("/calendar");
  const isOwner = profile?.role === "owner";

  let organizationName = "our team";
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();
    if (org?.name) organizationName = org.name;
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <SignOutButton />
        </div>
        <div className="topbar-row">
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Invite</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={true} isSuperadmin={isSuperadmin(user.email)} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <InviteLink isOwner={isOwner} organizationName={organizationName} />
        <p style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 760 }}>
          Your team is under <Link href="/cleaners">Manage → Cleaners</Link>.
        </p>
      </main>
    </div>
  );
}
