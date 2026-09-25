"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";
import { getStripe } from "@/lib/stripe";
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
  linen_pickup: boolean;
  platform_label: string | null;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Push a heads-up about a new/changed assignment. Only ever called after
// the write it describes has already succeeded -- a failure here is
// swallowed inside sendPushToUsers, never surfaced to the admin saving
// the booking.
async function notifyAssignment(
  supabase: SupabaseServer,
  input: Pick<BookingInput, "property_id" | "checkin_date" | "assigned_cleaner_id" | "is_open_job">,
) {
  const { data: property } = await supabase
    .from("properties")
    .select("name")
    .eq("id", input.property_id)
    .maybeSingle();
  const propertyName = property?.name ?? "a property";
  const when = new Date(input.checkin_date).toLocaleDateString();

  if (input.is_open_job) {
    // Staff creating/editing this booking is always admin, so profiles
    // RLS (profiles_select_own_or_admin) already lets this read every
    // cleaner's id directly -- no RPC needed.
    const { data: cleanerProfiles } = await supabase.from("profiles").select("id").eq("role", "cleaner");
    const ids = (cleanerProfiles ?? []).map((p) => p.id as string);
    await sendPushToUsers(ids, {
      title: "New open job posted",
      body: `${propertyName} — check-in ${when}. First to claim it gets it.`,
      url: "/calendar",
    });
  } else if (input.assigned_cleaner_id) {
    await sendPushToUsers([input.assigned_cleaner_id], {
      title: "New job assigned to you",
      body: `${propertyName} — check-in ${when}.`,
      url: "/calendar",
    });
  }
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
  await notifyAssignment(supabase, input);
}

export async function updateBookingAdmin(id: string, input: BookingInput) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("assigned_cleaner_id, is_open_job")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("bookings").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");

  // Only notify when the assignment itself actually changed -- otherwise
  // every edit to notes/checklist/etc. on an already-assigned booking
  // would re-notify the same cleaner for no reason.
  const assignmentChanged =
    !existing ||
    existing.assigned_cleaner_id !== input.assigned_cleaner_id ||
    existing.is_open_job !== input.is_open_job;
  if (assignmentChanged) {
    await notifyAssignment(supabase, input);
  }
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
  const { data: booking } = await supabase
    .from("bookings")
    .select("assigned_cleaner_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("bookings")
    .update({ rating, rating_comment: comment })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
  revalidatePath("/cleaners");

  if (booking?.assigned_cleaner_id) {
    await sendPushToUsers([booking.assigned_cleaner_id], {
      title: "You got a new rating",
      body: `★ ${rating}${comment ? ` — ${comment}` : ""}`,
      url: "/history",
    });
  }
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

// Cleaner declines a job an Owner/Manager assigned directly to them
// (not from the open board) -- puts it back in the open pool instead of
// leaving it stuck. Only works before the job has started -- see
// decline_assigned_booking in supabase/migrations/0011_decline_assigned_job.sql.
export async function declineAssignedBooking(id: string) {
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("property_id, checkin_date")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.rpc("decline_assigned_booking", { p_booking_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");

  if (booking) {
    const { data: staffIds } = await supabase.rpc("staff_user_ids");
    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", booking.property_id)
      .maybeSingle();
    await sendPushToUsers((staffIds as string[] | null) ?? [], {
      title: "Job declined",
      body: `${property?.name ?? "A booking"} — check-in ${new Date(booking.checkin_date).toLocaleDateString()} is back on the open board.`,
      url: "/calendar",
    });
  }
}

// Post a message in a booking's dispute thread. Works for admin or the
// assigned cleaner -- RLS (`dispute_messages_insert_admin` /
// `dispute_messages_insert_assigned_cleaner`) decides which applies, and
// a trigger stamps the real author name/role server-side regardless of
// what's passed here. Any message reopens the thread if it was resolved.
export async function postDisputeMessage(bookingId: string, body: string) {
  if (!body.trim()) throw new Error("Message can't be empty.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("dispute_messages")
    .insert({ booking_id: bookingId, author_id: user.id, body: body.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");

  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const { data: booking } = await supabase
    .from("bookings")
    .select("assigned_cleaner_id, property_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (booking) {
    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", booking.property_id)
      .maybeSingle();
    const payload = {
      title: "New dispute message",
      body: `${property?.name ?? "A booking"}: ${body.trim().slice(0, 120)}`,
      url: "/calendar",
    };
    if (authorProfile?.role === "cleaner") {
      const { data: staffIds } = await supabase.rpc("staff_user_ids");
      await sendPushToUsers((staffIds as string[] | null) ?? [], payload);
    } else if (booking.assigned_cleaner_id) {
      await sendPushToUsers([booking.assigned_cleaner_id], payload);
    }
  }
}

// Admin marks a dispute resolved. A plain bookings update, covered by
// the existing `bookings_admin_write` policy -- a non-admin calling this
// just gets a permission error back from Supabase.
export async function resolveDispute(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ dispute_status: "resolved" })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);
  revalidatePath("/calendar");
}

// Staff-triggered, one booking at a time -- money movement here is
// always an explicit action someone approves, never an automatic side
// effect of marking a booking complete (same "you approve every step
// that touches money" posture as the rest of the app's admin actions).
// A failure (e.g. the platform's Stripe balance can't cover the
// transfer yet) surfaces directly to whoever clicked the button, unlike
// push notifications' deliberately-swallowed errors -- this is a real
// financial action, not a best-effort convenience.
export async function payCleanerForBooking(bookingId: string) {
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, property_id, assigned_cleaner_id, status, payout_status, linen_pickup")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) throw new Error(error?.message ?? "Booking not found.");
  if (booking.status !== "complete") throw new Error("Booking isn't marked complete yet.");
  if (!booking.assigned_cleaner_id) throw new Error("No cleaner assigned to this booking.");
  if (booking.payout_status === "paid") throw new Error("This booking has already been paid out.");

  const { data: property } = await supabase
    .from("properties")
    .select("payout_rate_cents, linen_box_count, linen_fee_cents")
    .eq("id", booking.property_id)
    .maybeSingle();
  if (!property?.payout_rate_cents) {
    throw new Error("This property has no payout rate set -- add one on the Properties page first.");
  }

  // The linen fee (box count and per-box rate, both set per property
  // since different host businesses charge different amounts) is
  // computed from the property/booking rows read here, never trusted
  // from the client, since this is what actually gets transferred via
  // Stripe.
  const linenFeeCents = booking.linen_pickup
    ? (property.linen_box_count ?? 0) * (property.linen_fee_cents ?? 0)
    : 0;
  const totalCents = property.payout_rate_cents + linenFeeCents;

  const { data: cleaner } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_status")
    .eq("id", booking.assigned_cleaner_id)
    .maybeSingle();
  if (!cleaner?.stripe_connect_account_id || cleaner.stripe_connect_status !== "active") {
    throw new Error("This cleaner hasn't finished setting up payouts yet.");
  }

  const stripe = getStripe();
  const transfer = await stripe.transfers.create({
    amount: totalCents,
    currency: "aud",
    destination: cleaner.stripe_connect_account_id,
    metadata: { booking_id: bookingId },
  });

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ payout_status: "paid", stripe_transfer_id: transfer.id })
    .eq("id", bookingId);
  if (updateError) throw new Error(updateError.message);

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
