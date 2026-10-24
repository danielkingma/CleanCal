import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CleanerAccordion from "@/components/CleanerAccordion";
import Logo from "@/components/Logo";
import TeamRoles from "@/components/TeamRoles";
import { RemoveCleanerButton, RestoreCleanerButton, DeleteCleanerButton } from "@/components/CleanerRemoval";
import SignOutButton from "@/components/SignOutButton";
import NavMenus from "@/components/NavMenus";
import { isStaff, type Profile } from "@/lib/types";
import { isSuperadmin } from "@/lib/superadmin";

export default async function CleanersPage() {
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

  const { data: cleaners } = await supabase
    .from("profiles")
    .select("id, name, bio, phone, service_area, address, identity_status, deactivated_at, favorite_color")
    .eq("role", "cleaner")
    .is("deactivated_at", null)
    .order("name");

  // Kept out of the main list, but still visible (owner-only, see below)
  // so a removal made by mistake is a click to undo, not a support
  // ticket -- see removeCleaner/restoreCleaner in cleaners/actions.ts.
  const { data: removedCleaners } = isOwner
    ? await supabase
        .from("profiles")
        .select("id, name, deactivated_at")
        .eq("role", "cleaner")
        .not("deactivated_at", "is", null)
        .order("deactivated_at", { ascending: false })
    : { data: null };

  let allProfiles: Profile[] = [];
  // Owner-only (see org_member_emails, 0027_org_member_emails.sql) -- a
  // profiles.name that defaults to an email's local part at signup
  // (handle_new_user, 0001_init.sql) can look like a name and not be
  // one, so the page shows the real email address too rather than
  // leaving an owner to guess whether "smsf.kingma" is someone's actual
  // name or just a not-yet-personalized account.
  let emailById: Record<string, string> = {};
  if (isOwner) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role")
      .is("deactivated_at", null)
      .order("name");
    allProfiles = data ?? [];

    const { data: emailRows } = await supabase.rpc("org_member_emails");
    emailById = Object.fromEntries(
      ((emailRows as { id: string; email: string }[] | null) ?? []).map((r) => [r.id, r.email]),
    );
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

  // Highest-rated first; ties and the unrated keep the alphabetical order
  // the query above already gave them (Array#sort is stable) -- a rating
  // that only ever showed as a number next to each name didn't actually
  // make the list easier to scan for who's doing the best work.
  const sortedCleaners = [...(cleaners ?? [])].sort((a, b) => {
    const ra = ratingByCleanerId.get(a.id);
    const rb = ratingByCleanerId.get(b.id);
    const avgA = ra ? ra.total / ra.count : null;
    const avgB = rb ? rb.total / rb.count : null;
    if (avgA == null && avgB == null) return 0;
    if (avgA == null) return 1;
    if (avgB == null) return -1;
    return avgB - avgA;
  });

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
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <SignOutButton />
        </div>
        <div className="topbar-row">
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Cleaners</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={true} isSuperadmin={isSuperadmin(user.email)} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        {isOwner ? <TeamRoles profiles={allProfiles} currentUserId={user.id} emailById={emailById} /> : null}

        {(cleaners ?? []).length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            No cleaners yet — <Link href="/invite">invite someone</Link> to bring one onto your team.
          </p>
        ) : null}

        {sortedCleaners.map((cleaner) => {
          const rating = ratingByCleanerId.get(cleaner.id);
          const average = rating ? rating.total / rating.count : null;
          const upcomingOff = unavailableByCleanerId.get(cleaner.id) ?? [];

          return (
            <CleanerAccordion
              key={cleaner.id}
              id={cleaner.id}
              title={
                <>
                  {cleaner.favorite_color ? (
                    <span className="cleaner-color-dot" style={{ background: cleaner.favorite_color }} />
                  ) : null}
                  {cleaner.name || "(no name set)"}
                </>
              }
              meta={
                <span className="rating-summary">
                  {average != null ? `★ ${average.toFixed(1)} (${rating!.count})` : "No ratings yet"}
                </span>
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  rowGap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 6 }}>
                  {isOwner && emailById[cleaner.id] ? (
                    <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{emailById[cleaner.id]}</span>
                  ) : null}
                  {cleaner.identity_status === "verified" ? (
                    <span className="sync-pill ok">ID verified</span>
                  ) : cleaner.identity_status === "pending" ? (
                    <span className="sync-pill never">ID pending</span>
                  ) : (
                    <span className="sync-pill error">ID not verified</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>
                {cleaner.phone ? `${cleaner.phone} · ` : ""}
                {cleaner.service_area || "No service area set"}
              </p>
              {cleaner.address ? (
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{cleaner.address}</p>
              ) : null}
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
              {isOwner ? <RemoveCleanerButton cleanerId={cleaner.id} cleanerName={cleaner.name} /> : null}
            </CleanerAccordion>
          );
        })}

        {isOwner && removedCleaners && removedCleaners.length > 0 ? (
          <div className="property-card" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Removed cleaners</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
              No longer able to sign in. Their past bookings, ratings, and payout history are
              untouched.
            </p>
            {removedCleaners.map((cleaner) => (
              <div
                key={cleaner.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  rowGap: 8,
                  padding: "10px 0",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {cleaner.name || "(no name set)"}
                    {emailById[cleaner.id] ? (
                      <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>
                        {emailById[cleaner.id]}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    Removed {new Date(cleaner.deactivated_at as string).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <RestoreCleanerButton cleanerId={cleaner.id} />
                  <DeleteCleanerButton cleanerId={cleaner.id} cleanerName={cleaner.name} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
