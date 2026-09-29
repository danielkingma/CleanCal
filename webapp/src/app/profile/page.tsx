import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { smsConfigured } from "@/lib/sms";
import ProfileForm from "@/components/ProfileForm";
import { isOwner, type Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, role, bio, phone, sms_opt_in, service_area, identity_status, stripe_connect_status, organization_id")
    .eq("id", user.id)
    .single();

  // This used to silently redirect("/calendar") whenever `profile` came
  // back falsy, whether that meant "this account genuinely has no
  // profile row" (essentially never, for a session that already passed
  // proxy.ts's own profile lookup) or "the query errored" (a transient
  // Supabase hiccup, a column PostgREST's schema cache hasn't picked up
  // yet, etc). The second case looked from the outside exactly like
  // clicking My Profile silently doing nothing -- the URL would change to
  // /profile and then bounce straight back to /calendar with no visible
  // error anywhere. Surfacing the real error (and logging it server-side
  // for the Vercel function logs) turns that into something reportable
  // instead of a dead end, matching the fail-open-with-a-message
  // approach proxy.ts already takes on its own profile lookup.
  if (profileError) {
    console.error("profile/page: profile lookup failed:", profileError.message);
    return (
      <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 24px" }}>
        <div className="property-card">
          <h2 style={{ marginTop: 0 }}>Couldn&apos;t load your profile</h2>
          <p className="access-note">
            {profileError.message || "Something went wrong loading your profile."}
          </p>
          <a href="/calendar" className="btn btn-secondary" style={{ marginTop: 10, display: "inline-block" }}>
            ← Back to calendar
          </a>
        </div>
      </main>
    );
  }
  if (!profile) redirect("/calendar");

  let organizationName: string | null = null;
  if (isOwner(profile.role) && profile.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();
    organizationName = org?.name ?? null;
  }

  const { data: devices } = await supabase
    .from("known_devices")
    .select("id, label, last_seen_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  // Twilio env vars are server-only (never NEXT_PUBLIC_*), so this is the
  // only place that can decide whether the SMS opt-in checkbox is worth
  // showing at all -- see the comment on smsConfigured() in lib/sms.ts.
  return (
    <ProfileForm
      profile={profile as Profile}
      email={user.email ?? ""}
      smsAvailable={smsConfigured()}
      devices={devices ?? []}
      organizationName={organizationName}
    />
  );
}
