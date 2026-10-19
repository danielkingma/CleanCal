import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import NavMenus from "@/components/NavMenus";
import { addDays, checkoutDate, isoDate } from "@/lib/calendar-utils";
import { isStaff, type Booking } from "@/lib/types";
import { isSuperadmin } from "@/lib/superadmin";
import { spotConflicts } from "@/lib/conflicts";

interface AttentionItem {
  type: "Dispute" | "Unclaimed";
  propertyName: string;
  date: string;
  detail: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isStaff(profile?.role)) redirect("/calendar");

  const { data: propertiesData } = await supabase
    .from("properties")
    .select("id, name, checkout_time, checkin_time, timezone, clean_minutes");
  const properties = propertiesData ?? [];
  const propertyNameById = Object.fromEntries(properties.map((p) => [p.id, p.name]));

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, status, is_open_job, assigned_cleaner_id, dispute_status, rating, cleaning_started_at, cleaning_completed_at",
    );
  const bookings = (bookingsData ?? []) as Booking[];

  const { data: cleanersData } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "cleaner")
    .is("deactivated_at", null);
  const cleanerCount = (cleanersData ?? []).length;

  const today = new Date();
  const weekOut = addDays(today, 7);

  const upcomingCleans = bookings.filter((b) => {
    if (b.status === "complete") return false;
    const co = checkoutDate(b);
    return co >= today && co <= weekOut;
  }).length;

  const openJobsUnclaimed = bookings.filter(
    (b) => b.is_open_job && !b.assigned_cleaner_id && b.status !== "complete",
  ).length;

  const inProgressNow = bookings.filter((b) => b.status === "in-progress").length;
  const openDisputes = bookings.filter((b) => b.dispute_status === "open").length;

  const rated = bookings.filter((b) => b.rating != null);
  const averageRating = rated.length
    ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length
    : null;

  const attentionItems: AttentionItem[] = [];
  for (const b of bookings) {
    const propertyName = propertyNameById[b.property_id] ?? "—";
    if (b.dispute_status === "open") {
      attentionItems.push({ type: "Dispute", propertyName, date: b.checkin_date, detail: "Open dispute" });
    }
    if (b.is_open_job && !b.assigned_cleaner_id && b.status !== "complete") {
      attentionItems.push({ type: "Unclaimed", propertyName, date: b.checkin_date, detail: "Open job — needs a cleaner" });
    }
  }
  attentionItems.sort((a, b) => a.date.localeCompare(b.date));

  const todayIso = isoDate(today);
  const conflicts = spotConflicts({ properties, bookings, now: new Date(), horizonDays: 3 });

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
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Dashboard</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={true} isSuperadmin={isSuperadmin(user.email)} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <div className="stat-grid">
          <div className="stat-tile accent-amber">
            <div className="stat-number">{upcomingCleans}</div>
            <div className="stat-label">Cleans due in 7 days</div>
          </div>
          <div className="stat-tile accent-coral">
            <div className="stat-number">{openJobsUnclaimed}</div>
            <div className="stat-label">Open jobs, unclaimed</div>
          </div>
          <div className="stat-tile accent-blue">
            <div className="stat-number">{inProgressNow}</div>
            <div className="stat-label">In progress right now</div>
          </div>
          <div className="stat-tile accent-coral">
            <div className="stat-number">{openDisputes}</div>
            <div className="stat-label">Open disputes</div>
          </div>
          <div className="stat-tile accent-teal">
            <div className="stat-number">
              {averageRating != null ? averageRating.toFixed(1) : "—"}
            </div>
            <div className="stat-label">
              Team rating avg{cleanerCount ? ` · ${cleanerCount} cleaner${cleanerCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Same-day conflict spotter</h2>
        <p className="photo-note" style={{ maxWidth: 760, marginBottom: 10 }}>
          Checks today and the next 3 days: where a clean is expected to finish compared with the next guest&apos;s
          earliest check-in. Set each property&apos;s times on the Properties page.
        </p>
        {conflicts.length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760, marginBottom: 24 }}>
            No conflicts spotted — every turnover has room to spare.
          </p>
        ) : (
          <div className="property-card" style={{ marginBottom: 24 }}>
            <table className="feed-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Property</th>
                  <th>Date</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`attn-type-pill ${c.severity === "critical" ? "dispute" : "unclaimed"}`}>
                        {c.severity === "critical" ? "Conflict" : "Tight"}
                      </span>
                    </td>
                    <td>{c.propertyName}</td>
                    <td>{c.date === todayIso ? "Today" : new Date(c.date).toLocaleDateString()}</td>
                    <td>{c.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Needs attention</h2>
        {attentionItems.length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            Nothing needs attention right now — no open disputes, and every open job is claimed.
          </p>
        ) : (
          <div className="property-card">
            <table className="feed-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Property</th>
                  <th>Date</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {attentionItems.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`attn-type-pill ${item.type.toLowerCase()}`}>{item.type}</span>
                    </td>
                    <td>{item.propertyName}</td>
                    <td>
                      {new Date(item.date).toLocaleDateString()}
                      {item.date < todayIso ? " (past)" : ""}
                    </td>
                    <td>{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
