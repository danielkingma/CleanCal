import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, role, bio, phone, service_area, identity_status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/calendar");

  return <ProfileForm profile={profile as Profile} email={user.email ?? ""} />;
}
