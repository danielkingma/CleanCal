"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";
import type { Role } from "@/lib/types";

// Owner-only in practice -- enforced by the `profiles_owner_write` RLS
// policy (supabase/migrations/0009_owner_manager_roles.sql), which lets
// only an owner write to a profile row that isn't their own. The
// self-role check here is just a friendlier error message; RLS is what
// actually stops it (and stops a non-owner from getting here at all).
export async function updateUserRole(userId: string, newRole: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) throw new Error("You can't change your own role.");

  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/cleaners");
  revalidatePath("/calendar");
}

// Generates a one-time invite link for someone to join this organization.
// Enforcement lives in `organization_invites_insert_staff` RLS
// (0016_organizations.sql): a Manager can only invite at the cleaner
// role, only an Owner can invite Owner/Manager -- same boundary as
// changing an existing member's role.
export async function createInvite(role: Role): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) throw new Error("No organization found.");

  const { data, error } = await supabase
    .from("organization_invites")
    .insert({ organization_id: profile.organization_id, role, created_by: user.id })
    .select("token")
    .single();
  if (error) throw new Error(error.message);
  return data.token as string;
}

// Owner-only, same RLS as updateUserRole above. Doesn't delete the
// profile/auth user -- see supabase/migrations/0026_remove_cleaner.sql
// for why a hard delete isn't safe here (dispute_messages.author_id and
// organization_invites.redeemed_by both reference profiles with no
// cascade, and every invited cleaner has a redeemed_by row). Instead:
// any of their not-yet-complete upcoming jobs go back on the open board
// (same shape as a cleaner declining one themselves, decline_assigned_booking
// in 0011_decline_assigned_job.sql) rather than staying silently assigned
// to someone who's about to be signed out and locked out for good, then
// the profile itself is flagged deactivated -- src/proxy.ts signs them
// out and blocks them from getting back in from here on.
export async function removeCleaner(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) throw new Error("You can't remove your own account this way.");

  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (target?.role !== "cleaner") throw new Error("Only cleaner accounts can be removed here.");

  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id")
    .eq("assigned_cleaner_id", userId)
    .neq("status", "complete")
    .gte("checkin_date", todayIso);

  if (upcoming && upcoming.length > 0) {
    const { error: reopenError } = await supabase
      .from("bookings")
      .update({ assigned_cleaner_id: null, is_open_job: true, assignment_confirmed: false })
      .in(
        "id",
        upcoming.map((b) => b.id as string),
      );
    if (reopenError) throw new Error(reopenError.message);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/cleaners");
  revalidatePath("/calendar");

  if (upcoming && upcoming.length > 0) {
    const { data: cleanerProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "cleaner")
      .is("deactivated_at", null);
    const ids = (cleanerProfiles ?? []).map((p) => p.id as string).filter((id) => id !== userId);
    await notifyUsers(ids, {
      title: `${upcoming.length} job${upcoming.length > 1 ? "s" : ""} back on the open board`,
      body: "A cleaner left the team, so their upcoming job(s) are open for anyone to claim.",
      url: "/calendar",
    });
  }
}

// Undoes removeCleaner -- doesn't try to re-claim whatever got reopened
// onto the open board in the process; whoever's free can claim those
// same as any other open job, including this cleaner once they're back.
export async function restoreCleaner(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ deactivated_at: null }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/cleaners");
}
