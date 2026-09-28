import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { smsConfigured } from "@/lib/sms";
import ProfileForm from "@/components/ProfileForm";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, bio, phone, sms_opt_in, service_area, identity_status, stripe_connect_status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/calendar");

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
    />
  );
}
