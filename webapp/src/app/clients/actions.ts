"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStatementsAccess } from "@/lib/statements-access";
import type { FeeBasis } from "@/lib/types";

export interface ClientInput {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

function cleanClient(input: ClientInput): ClientInput {
  const name = input.name.trim();
  if (!name) throw new Error("A client needs a name.");
  return { name, email: input.email.trim(), phone: input.phone.trim(), notes: input.notes.trim() };
}

// All writes below are also enforced by staff-only RLS
// (0044_owner_statements_foundation.sql); the access check here just
// gives a clear message instead of a silent no-op.
export async function createPropertyOwner(input: ClientInput) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const { data, error } = await supabase.from("property_owners").insert(cleanClient(input)).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  return data.id as string;
}

export async function updatePropertyOwner(id: string, input: ClientInput) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  const { error } = await supabase.from("property_owners").update(cleanClient(input)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export async function deletePropertyOwner(id: string) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  // Properties assigned to this client are kept and simply become
  // unassigned (property_owner_id on delete set null).
  const { error } = await supabase.from("property_owners").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
}

export interface PropertyFinancialsInput {
  property_owner_id: string | null;
  mgmt_fee_percent: number;
  fee_basis: FeeBasis;
  owner_cleaning_charge_cents: number | null;
  airbnb_listing_name: string;
  booking_com_property_id: string;
}

export async function savePropertyFinancials(propertyId: string, input: PropertyFinancialsInput) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);

  const fee = Number(input.mgmt_fee_percent);
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) throw new Error("Management fee must be between 0 and 100%.");
  const cleaning = input.owner_cleaning_charge_cents;
  if (cleaning !== null && (!Number.isInteger(cleaning) || cleaning < 0)) {
    throw new Error("Cleaning charge must be zero or more.");
  }
  if (input.fee_basis !== "gross" && input.fee_basis !== "net_of_cleaning") throw new Error("Unknown fee basis.");

  const { error } = await supabase.from("property_financials").upsert(
    {
      property_id: propertyId,
      property_owner_id: input.property_owner_id || null,
      mgmt_fee_percent: Math.round(fee * 100) / 100,
      fee_basis: input.fee_basis,
      owner_cleaning_charge_cents: cleaning,
      airbnb_listing_name: input.airbnb_listing_name.trim(),
      booking_com_property_id: input.booking_com_property_id.trim(),
    },
    { onConflict: "property_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath("/payouts");
}
