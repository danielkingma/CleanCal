"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStatementsAccess } from "@/lib/statements-access";
import { monthRange } from "@/lib/statements";
import { loadStatement } from "./data";

export async function addOwnerExpense(input: {
  property_id: string;
  expense_date: string;
  description: string;
  amount_cents: number;
}) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const description = input.description.trim().slice(0, 200);
  if (!description) throw new Error("Describe the expense.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expense_date)) throw new Error("Choose a date.");
  if (!Number.isInteger(input.amount_cents) || input.amount_cents < 0) throw new Error("Enter a valid amount.");
  const { error } = await supabase.from("owner_expenses").insert({
    property_id: input.property_id,
    expense_date: input.expense_date,
    description,
    amount_cents: input.amount_cents,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/statements");
}

export async function deleteOwnerExpense(id: string) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const { error } = await supabase.from("owner_expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/statements");
}

// Recalculates server-side (never trusts a client-sent snapshot) and
// freezes it. Saving again for the same client and month replaces the
// snapshot but keeps the owner link and its on/off state.
export async function saveStatement(ownerId: string, month: string): Promise<string> {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const range = monthRange(month);
  if (!range) throw new Error("Choose a month.");
  const loaded = await loadStatement(supabase, ownerId, range.start, range.end);
  if (!loaded) throw new Error("Client not found.");
  const { data, error } = await supabase
    .from("owner_statements")
    .upsert(
      { property_owner_id: ownerId, period_start: range.start, period_end: range.end, snapshot: loaded.snapshot },
      { onConflict: "property_owner_id,period_start,period_end" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/statements");
  return data.id as string;
}

export async function deleteStatement(id: string) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const { error } = await supabase.from("owner_statements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/statements");
}

export async function setStatementShare(id: string, enabled: boolean) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const { error } = await supabase.from("owner_statements").update({ share_enabled: enabled }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/statements/${id}`);
}

// A new token kills the old link.
export async function regenerateStatementLink(id: string) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const { error } = await supabase
    .from("owner_statements")
    .update({ share_token: crypto.randomUUID() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/statements/${id}`);
}
