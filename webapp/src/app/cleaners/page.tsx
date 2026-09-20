import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function CleanersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/calendar");

  const { data: cleaners } = await supabase
    .from("profiles")
    .select("id, name, bio, phone, service_area")
    .eq("role", "cleaner")
    .order("name");

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

  return (
    <div>
      <div className="topbar">
        <div className="brand">
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
        {(cleaners ?? []).length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            No cleaners have signed up yet. Anyone who signs in gets the cleaner role by
            default, so they&apos;ll show up here as soon as they do.
          </p>
        ) : null}

        {(cleaners as Profile[] | null)?.map((cleaner) => {
          const rating = ratingByCleanerId.get(cleaner.id);
          const average = rating ? rating.total / rating.count : null;

          return (
            <div className="property-card" key={cleaner.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{cleaner.name || "(no name set)"}</h2>
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
            </div>
          );
        })}
      </main>
    </div>
  );
}
