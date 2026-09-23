import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";

export default async function AvailabilityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("cleaner_unavailable_dates")
    .select("date")
    .eq("cleaner_id", user.id);
  const initialDates = (rows ?? []).map((r) => r.date as string);

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>My availability</div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
        </div>
      </div>

      <main>
        <AvailabilityCalendar initialDates={initialDates} />
      </main>
    </div>
  );
}
