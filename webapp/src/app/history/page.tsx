import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import { getPlatformBadge } from "@/lib/platform-badge";
import { isStaff, type Booking, type Profile } from "@/lib/types";

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  const currentProfile: Profile = profile ?? {
    id: user.id,
    name: user.email?.split("@")[0] ?? "You",
    role: "cleaner",
  };
  const staffView = isStaff(currentProfile.role);

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, guests, assigned_cleaner_id, platform_label, rating, rating_comment, dispute_status",
    )
    .eq("status", "complete")
    .order("checkin_date", { ascending: false });
  if (!staffView) {
    bookingsQuery = bookingsQuery.eq("assigned_cleaner_id", user.id);
  }
  const { data: bookings } = await bookingsQuery;
  const completed = (bookings ?? []) as Booking[];

  const { data: properties } = await supabase.from("properties").select("id, name");
  const propertyNameById = Object.fromEntries((properties ?? []).map((p) => [p.id, p.name]));

  let cleanerNameById: Record<string, string> = {};
  if (staffView) {
    const { data: allProfiles } = await supabase.from("profiles").select("id, name");
    cleanerNameById = Object.fromEntries((allProfiles ?? []).map((p) => [p.id, p.name]));
  }

  const rated = completed.filter((b) => b.rating != null);
  const averageRating = rated.length
    ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length
    : null;

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Cleaning history</div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
        </div>
      </div>

      <main>
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 18 }}>
          {completed.length} completed clean{completed.length === 1 ? "" : "s"}
          {averageRating != null ? ` · ★ ${averageRating.toFixed(1)} average` : ""}
        </p>

        {completed.length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            {staffView
              ? "No completed cleans yet — they'll show up here once a booking is marked complete."
              : "You haven't completed a clean yet — once you do, it'll show up here."}
          </p>
        ) : (
          <div className="property-card">
            <table className="feed-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Guest(s)</th>
                  <th>Check-in</th>
                  <th>Nights</th>
                  <th>Source</th>
                  {staffView ? <th>Cleaner</th> : null}
                  <th>Rating</th>
                  <th>Dispute</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((b) => {
                  const platform = getPlatformBadge(b.platform_label);
                  return (
                    <tr key={b.id}>
                      <td>{propertyNameById[b.property_id] ?? "—"}</td>
                      <td>{b.guests || "—"}</td>
                      <td>{new Date(b.checkin_date).toLocaleDateString()}</td>
                      <td>{b.nights}</td>
                      <td>
                        {platform ? (
                          <span className="source-pill" style={{ background: platform.color }}>
                            {platform.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {staffView ? (
                        <td>{(b.assigned_cleaner_id && cleanerNameById[b.assigned_cleaner_id]) || "—"}</td>
                      ) : null}
                      <td>
                        {b.rating != null ? (
                          <span className="rating-summary">
                            ★ {b.rating}
                            {b.rating_comment ? ` · ${b.rating_comment}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {b.dispute_status && b.dispute_status !== "none" ? (
                          <span className={`dispute-pill ${b.dispute_status}`}>
                            {b.dispute_status === "open" ? "Open" : "Resolved"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
