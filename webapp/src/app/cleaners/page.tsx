import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InviteLink from "@/components/InviteLink";
import Logo from "@/components/Logo";
import TeamRoles from "@/components/TeamRoles";
import { RemoveCleanerButton, RestoreCleanerButton, DeleteCleanerButton } from "@/components/CleanerRemoval";
import SignOutButton from "@/components/SignOutButton";
import { isStaff, type Profile } from "@/lib/types";

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

  let organizationName = "our team";
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();
    if (org?.name) organizationName = org.name;
  }

  const { data: cleaners } = await supabase
    .from("profiles")
    .select("id, name, bio, phone, service_area, identity_status, stripe_connect_status, deactivated_at")
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
          <SignOutButton />
        </div>
      </div>

      <main>
        <InviteLink isOwner={isOwner} organizationName={organizationName} />

        {isOwner ? <TeamRoles profiles={allProfiles} currentUserId={user.id} emailById={emailById} /> : null}

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
                  <h2 style={{ fontSize: 18, margin: 0, overflowWrap: "anywhere" }}>
                    {cleaner.name || "(no name set)"}
                  </h2>
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
              {isOwner ? <RemoveCleanerButton cleanerId={cleaner.id} cleanerName={cleaner.name} /> : null}
            </div>
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
