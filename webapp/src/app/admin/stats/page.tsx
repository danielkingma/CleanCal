import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperadmin } from "@/lib/superadmin";

// Owner-only page -- not in the main site nav since it isn't relevant to
// any normal Owner/Manager/Cleaner, but linked from the Menu dropdown
// (NavMenus.tsx / CalendarApp.tsx's own copy of it) whenever the signed-in
// account is the superadmin one. This is the one place that looks across
// every organization on the whole platform at once, which is why it
// reads through the service-role client (bypassing RLS) rather than a
// normal signed-in session -- every other query in this app is
// intentionally scoped to the caller's own organization (see
// supabase/migrations/0016_organizations.sql's own comment: "nobody
// outside your team ever sees your properties, bookings, or cleaners").

const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(n: number | null) {
  return (n ?? 0).toLocaleString();
}

export default async function AdminStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperadmin(user.email)) {
    redirect("/calendar");
  }

  const service = createServiceClient();

  const [orgsRes, profilesRes, propertiesRes, bookingsRes] = await Promise.all([
    service.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }),
    service.from("profiles").select("role, created_at, deactivated_at"),
    service.from("properties").select("*", { count: "exact", head: true }),
    service.from("bookings").select("*", { count: "exact", head: true }),
  ]);

  const organizations = orgsRes.data ?? [];
  const activeProfiles = (profilesRes.data ?? []).filter((p) => !p.deactivated_at);

  const roleCounts = { owner: 0, manager: 0, cleaner: 0 };
  for (const p of activeProfiles) {
    if (p.role in roleCounts) roleCounts[p.role as keyof typeof roleCounts]++;
  }

  const now = Date.now();
  const signupsWithin = (days: number) =>
    activeProfiles.filter((p) => now - new Date(p.created_at).getTime() < days * DAY_MS).length;
  const orgsWithin = (days: number) =>
    organizations.filter((o) => now - new Date(o.created_at).getTime() < days * DAY_MS).length;

  const stat = (label: string, value: string | number) => (
    <div
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "16px 18px",
        minWidth: 150,
      }}
    >
      <div style={{ fontSize: 12.5, color: "var(--ink)", opacity: 0.65, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: '"Fraunces", serif' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 20px 80px" }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Owner-only · not linked anywhere in the app</p>
      <h1 style={{ fontFamily: '"Fraunces", serif', marginBottom: 24 }}>Platform stats</h1>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Businesses signed up</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        {stat("Total businesses", fmt(organizations.length))}
        {stat("New in last 7 days", fmt(orgsWithin(7)))}
        {stat("New in last 30 days", fmt(orgsWithin(30)))}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>People signed up (active accounts)</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        {stat("Total people", fmt(activeProfiles.length))}
        {stat("Owners", fmt(roleCounts.owner))}
        {stat("Managers", fmt(roleCounts.manager))}
        {stat("Cleaners", fmt(roleCounts.cleaner))}
        {stat("New in last 7 days", fmt(signupsWithin(7)))}
        {stat("New in last 30 days", fmt(signupsWithin(30)))}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Usage</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        {stat("Properties", fmt(propertiesRes.count))}
        {stat("Bookings", fmt(bookingsRes.count))}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Businesses, newest first</h2>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 14px" }}>{o.name}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", opacity: 0.7 }}>
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {organizations.length === 0 ? (
              <tr>
                <td style={{ padding: "10px 14px", opacity: 0.6 }}>No businesses yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 32, fontSize: 13, opacity: 0.7 }}>
        Website visit/traffic numbers live in Vercel&apos;s own dashboard (Analytics tab), not here — this page only
        covers CleanCal&apos;s own signup data.
      </p>
    </div>
  );
}
