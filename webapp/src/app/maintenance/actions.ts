"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";
import type { WorkOrderPriority, WorkOrderStatus } from "@/lib/types";

export interface WorkOrderInput {
  property_id: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  assigned_to: string | null;
  due_date: string | null;
}

// Staff-only (enforced by work_orders_staff_write RLS, 0037_maintenance.sql).
export async function createWorkOrder(input: WorkOrderInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from("work_orders")
    .insert({ ...input, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");

  if (input.assigned_to) {
    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", input.property_id)
      .maybeSingle();
    await notifyUsers([input.assigned_to], {
      title: "New work order assigned to you",
      body: `${property?.name ?? "A property"} — ${input.title}`,
      url: "/maintenance",
    });
  }
  return row.id as string;
}

// Staff-only direct update -- title/description/assignment/etc. Status
// changes made this way (as opposed to update_own_work_order_status,
// which is the cleaner's narrower path) still go through the same
// work_orders_before_write trigger, so completing one this way rolls a
// linked preventative schedule forward exactly the same.
export async function updateWorkOrder(id: string, input: WorkOrderInput & { status: WorkOrderStatus }) {
  const supabase = await createClient();
  const { error } = await supabase.from("work_orders").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}

// The cleaner's own path -- only ever touches status, via the
// update_own_work_order_status RPC, which checks assigned_to = auth.uid()
// itself (see 0037_maintenance.sql).
export async function updateOwnWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_work_order_status", { p_id: id, p_status: status });
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}

export async function deleteWorkOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}

export interface MaintenanceScheduleInput {
  property_id: string;
  title: string;
  interval_days: number;
}

export async function createMaintenanceSchedule(input: MaintenanceScheduleInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("maintenance_schedules")
    .insert({ ...input, created_by: user?.id ?? null, next_due_at: null });
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}

export async function deleteMaintenanceSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}

// Staff did the maintenance without waiting for it to go overdue (and
// without going through a work order at all) -- just rolls the schedule
// forward directly.
export async function markScheduleCompletedNow(id: string, intervalDays: number) {
  const supabase = await createClient();
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + intervalDays);
  const { error } = await supabase
    .from("maintenance_schedules")
    .update({ last_completed_at: new Date().toISOString(), next_due_at: nextDue.toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}

// Turns a schedule into an actionable work order right now, instead of
// waiting for the maintenance-due cron to notice it's overdue --
// schedule_id links it back so completing it still rolls the schedule
// forward (see work_orders_before_write).
export async function createWorkOrderFromSchedule(scheduleId: string) {
  const supabase = await createClient();
  const { data: schedule } = await supabase
    .from("maintenance_schedules")
    .select("property_id, title")
    .eq("id", scheduleId)
    .maybeSingle();
  if (!schedule) throw new Error("Schedule not found.");

  const { error } = await supabase.from("work_orders").insert({
    property_id: schedule.property_id,
    title: schedule.title,
    description: "Created from a preventative maintenance schedule.",
    priority: "normal",
    source: "preventative",
    schedule_id: scheduleId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/maintenance");
}
