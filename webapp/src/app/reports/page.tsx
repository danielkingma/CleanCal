import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportsView from "@/components/ReportsView";
import { isStaff, type Booking, type Profile, type Property } from "@/lib/types";

export default async function ReportsPage() {
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

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select(
      "id, property_id, checkin_date, nights, status, guests, assigned_cleaner_id, platform_label, rating, rating_comment, dispute_status, linen_pickup, cleaning_started_at, cleaning_completed_at",
    )
    .eq("status", "complete")
    .order("checkin_date", { ascending: false });

  const { data: propertiesData } = await supabase
    .from("properties")
    .select("id, name, payout_rate_cents, linen_box_count, linen_fee_cents")
    .order("name");
  const { data: profilesData } = await supabase.from("profiles").select("id, name").order("name");

  return (
    <ReportsView
      completed={(bookingsData ?? []) as Booking[]}
      properties={(propertiesData ?? []) as Property[]}
      profiles={(profilesData ?? []) as Profile[]}
    />
  );
}
