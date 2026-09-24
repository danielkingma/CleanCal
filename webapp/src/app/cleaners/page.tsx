import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InviteLink from "@/components/InviteLink";
import Logo from "@/components/Logo";
import TeamRoles from "@/components/TeamRoles";
import { isStaff, type Profile } from "@/lib/types";

export default async function CleanersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isStaff(profile?.role)) redirect("/calendar");
  const isOwner = profile?.role === "owner";

  const { data: cleaners } = await supabase
    .from("profiles")
    .select("id, name, bio, phone, service_area, identity_status, stripe_connect_status")
    .eq("role", "cleaner")
    .order("name");

  let allProfiles: Profile[] = [];
  if (isOwner) {
    const { data } = await supabase.from("profiles").select("id, name, role").order("name");
    allProfiles = data ?? [];
  }

  const { data: ratedBookings } = await supabase
    .from("bookings")
    .select("assigned_cleaner_id, rating")
    .not("rating", "is", null);

  const ratingByCleanerId = new Map<string, { total: number; count: number }>();
  for (const b of ratedBookings ?? []) {
    if (!b.assigned_cleaner_id || b.rating == null) continue;
    const entry = ratingByCleanerId.get(b.assigned_cleaner_id) ?? { total: 0, count: 0 };
    entry.total += b.rating;
    entry.count += 1;
    ratingByCleanerId.set(b.assigned_cleaner_id, entry);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: unavailableRows } = await supabase
    .from("cleaner_unavailable_dates")
    .select("cleaner_id, date")
    .gte("date", todayIso)
    .order("date");

  const unavailableByCleanerId = new Map<string, string[]>();
  for (const row of unavailableRows ?? []) {
    const list = unavailableByCleanerId.get(row.cleaner_id) ?? [];
    list.push(row.date);
    unavailableByCleanerId.set(row.cleaner_id, list);
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Cleaners</div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
        </div>
      </div>

      <main>
        <InviteLink isOwner={isOwner} />

        {isOwner ? <TeamRoles profiles={allProfiles} currentUserId={user.id} /> : null}

        {(cleaners ?? []).length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            No cleaners yet — generate an invite link above to bring one onto your team.
          </p>
        ) : null}

        {(cleaners as Profile[] | null)?.map((cleaner) => {
          const rating = ratingByCleanerId.get(cleaner.id);
          const average = rating ? rating.total / rating.count : null;
          const upcomingOff = unavailableByCleanerId.get(cleaner.id) ?? [];

          return (
            <div className="property-card" key={cleaner.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ fontSize: 18, margin: 0 }}>{cleaner.name || "(no name set)"}</h2>
                  {cleaner.identity_status === "verified" ? (
                    <span className="sync-pill ok">ID verified</span>
                  ) : cleaner.identity_status === "pending" ? (
                    <span className="sync-pill never">ID pending</span>
                  ) : (
                    <span className="sync-pill error">ID not verified</span>
                  )}
                  {cleaner.stripe_connect_status === "active" ? (
                    <span className="sync-pill ok">Payouts set up</span>
                  ) : cleaner.stripe_connect_status === "pending" ? (
                    <span className="sync-pill never">Payouts pending</span>
                  ) : (
                    <span className="sync-pill error">Payouts not set up</span>
                  )}
                </div>
                <span className="rating-summary">
                  {average != null ? `★ ${average.toFixed(1)} (${rating!.count})` : "No ratings yet"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>
                {cleaner.phone ? `${cleaner.phone} · ` : ""}
                {cleaner.service_area || "No service area set"}
              </p>
              {cleaner.bio ? (
                <p style={{ fontSize: 13.5, margin: "10px 0 0" }}>{cleaner.bio}</p>
              ) : null}
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 0" }}>
                {upcomingOff.length > 0
                  ? `Unavailable: ${upcomingOff
                      .slice(0, 5)
                      .map((d) => new Date(d).toLocaleDateString())
                      .join(", ")}${upcomingOff.length > 5 ? ` +${upcomingOff.length - 5} more` : ""}`
                  : "No upcoming unavailable dates"}
              </p>
            </div>
          );
        })}
      </main>
    </div>
  );
}
