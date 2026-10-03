import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import NavMenus from "@/components/NavMenus";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { isStaff } from "@/lib/types";
import { isSuperadmin } from "@/lib/superadmin";

export default async function AvailabilityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only used to decide whether to show the staff-only "Manage" menu --
  // this page itself works the same for any role, since it's always
  // scoped to the caller's own dates (cleaner_unavailable_* RLS).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isStaffUser = isStaff(profile?.role);

  const { data: rows } = await supabase
    .from("cleaner_unavailable_dates")
    .select("date")
    .eq("cleaner_id", user.id);
  const initialDates = (rows ?? []).map((r) => r.date as string);

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
          <div style={{ color: "var(--muted)", fontSize: 14 }}>My availability</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={isStaffUser} isSuperadmin={isSuperadmin(user.email)} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <AvailabilityCalendar initialDates={initialDates} />
      </main>
    </div>
  );
}
