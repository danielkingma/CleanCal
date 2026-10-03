import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MaintenanceView from "@/components/MaintenanceView";
import { isStaff, type MaintenanceSchedule, type Profile, type Property, type WorkOrder } from "@/lib/types";
import { isSuperadmin } from "@/lib/superadmin";

export default async function MaintenancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const staffUser = isStaff(profile?.role);

  const workOrdersQuery = supabase
    .from("work_orders")
    .select(
      "id, property_id, title, description, status, priority, source, assigned_to, related_booking_id, schedule_id, due_date, completed_at, created_at",
    )
    .order("created_at", { ascending: false });
  // A cleaner only ever sees their own work orders -- RLS already scopes
  // everything to this org, this just narrows the UI further to what's
  // actually theirs to act on.
  const { data: workOrdersData } = staffUser
    ? await workOrdersQuery
    : await workOrdersQuery.eq("assigned_to", user.id);

  const { data: properties } = await supabase.from("properties").select("id, name").order("name");

  let schedules: MaintenanceSchedule[] = [];
  let cleaners: Profile[] = [];
  if (staffUser) {
    const { data: schedulesData } = await supabase
      .from("maintenance_schedules")
      .select("id, property_id, title, interval_days, last_completed_at, next_due_at")
      .order("next_due_at");
    schedules = (schedulesData ?? []) as MaintenanceSchedule[];

    const { data: cleanerProfiles } = await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("role", "cleaner")
      .is("deactivated_at", null)
      .order("name");
    cleaners = (cleanerProfiles ?? []) as Profile[];
  }

  return (
    <MaintenanceView
      isStaffUser={staffUser}
      workOrders={(workOrdersData ?? []) as WorkOrder[]}
      schedules={schedules}
      properties={(properties ?? []) as Property[]}
      cleaners={cleaners}
      isSuperadmin={isSuperadmin(user.email)}
    />
  );
}
