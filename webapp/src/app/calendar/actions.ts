"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus, Checklist } from "@/lib/types";

export interface BookingInput {
  property_id: string;
  checkin_date: string;
  nights: number;
  status: BookingStatus;
  notes: string;
  guests: string;
  checklist: Checklist;
  assigned_cleaner_id: string | null;
  is_open_job: boolean;
}

// Admin-only writes. Enforcement lives in Postgres RLS (see
// supabase/migrations/0001_init.sql `bookings_admin_write`), not here --
// a non-admin calling this will simply get a permission error back from
// Supabase.

export async function createBooking(input: BookingInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

export async function updateBookingAdmin(id: string, input: BookingInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

export async function deleteBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

// Admin rates the cleaner's work on a booking. Covered by the same
// `bookings_admin_write` RLS policy as everything else admin-only here.
export async function rateBooking(id: string, rating: number, comment: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ rating, rating_comment: comment })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
  revalidatePath("/cleaners");
}

// Cleaner claims an open, unclaimed job for themselves. Atomic in
// Postgres (see claim_open_booking in
// supabase/migrations/0007_open_job_board.sql) -- if someone else claims
// it first, this throws rather than silently double-assigning it.
export async function claimOpenBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_open_booking", { p_booking_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

// Cleaner releases a job they claimed from the open board, back into the
// pool for someone else. Only works on a job they actually claimed that
// way -- see release_open_booking in the same migration.
export async function releaseOpenBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_open_booking", { p_booking_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

// Cleaner write path: goes through the `cleaner_update_booking` RPC, which
// checks server-side that the booking is assigned to the caller before
// touching anything, and only ever writes status/checklist.
export async function updateBookingCleaner(
  id: string,
  status: BookingStatus,
  checklist: Checklist,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cleaner_update_booking", {
    p_booking_id: id,
    p_status: status,
    p_checklist: checklist,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}
