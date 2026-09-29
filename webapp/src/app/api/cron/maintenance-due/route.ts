import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyUsers } from "@/lib/notify";

// Same external-scheduler pattern as /api/cron/sync-ical (see that
// route's comment, and webapp/README.md for setup) -- hit this once a
// day with an `Authorization: Bearer <CRON_SECRET>` header. Finds every
// preventative maintenance schedule that's now overdue and doesn't
// already have an open work order for it, creates one, and notifies that
// organization's staff. Completing the resulting work order rolls the
// schedule's due date forward automatically (work_orders_before_write,
// 0037_maintenance.sql) -- this route only ever needs to notice
// "overdue with nothing already open," never track state of its own.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; maintenance-due checks are disabled." },
      { status: 501 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: schedules, error } = await supabase
    .from("maintenance_schedules")
    .select("id, organization_id, property_id, title")
    .lte("next_due_at", today);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  for (const schedule of schedules ?? []) {
    const { data: existingOpen } = await supabase
      .from("work_orders")
      .select("id")
      .eq("schedule_id", schedule.id)
      .neq("status", "done")
      .maybeSingle();
    if (existingOpen) continue;

    const { error: insertError } = await supabase.from("work_orders").insert({
      property_id: schedule.property_id,
      title: schedule.title,
      description: "Auto-created: this preventative maintenance schedule is now overdue.",
      priority: "normal",
      source: "preventative",
      schedule_id: schedule.id,
    });
    if (insertError) continue;
    created++;

    const { data: staffProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", schedule.organization_id)
      .in("role", ["owner", "manager"]);
    const staffIds = (staffProfiles ?? []).map((p) => p.id as string);
    if (staffIds.length > 0) {
      await notifyUsers(staffIds, {
        title: "Maintenance due",
        body: schedule.title,
        url: "/maintenance",
      });
    }
  }

  return NextResponse.json({ checked: (schedules ?? []).length, created });
}
