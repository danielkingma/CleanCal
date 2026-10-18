"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireStatementsAccess } from "@/lib/statements-access";
import { isCurrency } from "@/lib/currencies";
import {
  buildMatchContext,
  matchPayoutRow,
  parsePayoutCsv,
  PayoutImportError,
  type DateOrder,
  PLATFORM_DISPLAY_NAME,
  type MatchBooking,
  type MatchListing,
  type MatchProperty,
  type Platform,
  type ParseResult,
  type SkippedRow,
} from "@/lib/payout-import";

// Server actions take a request body of about 1 MB by default; the
// client checks the file size first, and this is the backstop.
const MAX_CSV_CHARS = 950_000;

export interface ImportPayoutsInput {
  fileName: string;
  text: string;
  platform: Platform | "auto";
  dateOrder: DateOrder;
  defaultCurrency?: string;
}

export interface ImportPayoutsResult {
  importId: string | null;
  platform: Platform;
  total: number;
  imported: number;
  duplicates: number;
  matchedToBooking: number;
  matchedToPropertyOnly: number;
  unmatched: number;
  guestNamesFilled: number;
  skipped: SkippedRow[];
  warnings: string[];
}

interface BookingRow extends MatchBooking {
  guests: string;
}

async function loadMatchData(
  supabase: SupabaseClient,
  organizationId: string,
  codes: string[],
  checkins: string[],
): Promise<{ bookings: BookingRow[]; properties: MatchProperty[] }> {
  const { data: props, error: propsError } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (propsError) throw new Error(propsError.message);
  const { data: listings, error: listingsError } = await supabase
    .from("property_platform_listings")
    .select("property_id, platform, identifier");
  if (listingsError) throw new Error(listingsError.message);
  const listingsByProperty = new Map<string, MatchListing[]>();
  for (const l of listings ?? []) {
    const list = listingsByProperty.get(l.property_id as string) ?? [];
    list.push({ platform: l.platform as string, identifier: l.identifier as string });
    listingsByProperty.set(l.property_id as string, list);
  }
  const properties: MatchProperty[] = (props ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    listings: listingsByProperty.get(p.id as string) ?? [],
  }));

  const select = "id, property_id, checkin_date, confirmation_code, guests";
  const byId = new Map<string, BookingRow>();

  // Code lookups in chunks, to keep each request URL a sane length.
  for (let i = 0; i < codes.length; i += 150) {
    const { data, error } = await supabase
      .from("bookings")
      .select(select)
      .eq("organization_id", organizationId)
      .in("confirmation_code", codes.slice(i, i + 150));
    if (error) throw new Error(error.message);
    for (const b of data ?? []) byId.set(b.id as string, b as BookingRow);
  }

  if (checkins.length > 0) {
    const sorted = [...checkins].sort();
    const { data, error } = await supabase
      .from("bookings")
      .select(select)
      .eq("organization_id", organizationId)
      .gte("checkin_date", sorted[0])
      .lte("checkin_date", sorted[sorted.length - 1]);
    if (error) throw new Error(error.message);
    for (const b of data ?? []) byId.set(b.id as string, b as BookingRow);
  }

  return { bookings: Array.from(byId.values()), properties };
}

export async function importPayouts(input: ImportPayoutsInput): Promise<ImportPayoutsResult> {
  const supabase = await createClient();
  const access = await requireStatementsAccess(supabase);

  if (input.text.length > MAX_CSV_CHARS) {
    throw new Error("That file is too large to import in one go. Export one month at a time and import each.");
  }

  let parsed: ParseResult;
  try {
    parsed = parsePayoutCsv(input.text, {
      platform: input.platform,
      dateOrder: input.dateOrder,
      defaultCurrency: isCurrency(input.defaultCurrency) ? input.defaultCurrency : "AUD",
    });
  } catch (e) {
    if (e instanceof PayoutImportError) throw new Error(e.message);
    throw e;
  }

  const result: ImportPayoutsResult = {
    importId: null,
    platform: parsed.platform,
    total: parsed.rows.length + parsed.skipped.length,
    imported: 0,
    duplicates: 0,
    matchedToBooking: 0,
    matchedToPropertyOnly: 0,
    unmatched: 0,
    guestNamesFilled: 0,
    skipped: parsed.skipped,
    warnings: parsed.warnings,
  };
  if (parsed.rows.length === 0) return result;

  const codes: string[] = Array.from(new Set(parsed.rows.map((r) => r.confirmationCode).filter(Boolean)));
  const checkins: string[] = Array.from(
    new Set(parsed.rows.map((r) => r.checkinDate).filter((d): d is string => Boolean(d))),
  );
  const { bookings, properties } = await loadMatchData(supabase, access.organizationId, codes, checkins);
  const ctx = buildMatchContext(bookings, properties);
  const bookingById = new Map(bookings.map((b) => [b.id, b]));

  const { data: importRow, error: importError } = await supabase
    .from("payout_imports")
    .insert({
      platform: parsed.platform,
      file_name: input.fileName.slice(0, 200),
      uploaded_by: access.userId,
      rows_total: result.total,
      rows_skipped: parsed.skipped.length,
    })
    .select("id")
    .single();
  if (importError) throw new Error(importError.message);
  const importId = importRow.id as string;
  result.importId = importId;

  const matches = parsed.rows.map((row) => ({ row, match: matchPayoutRow(row, ctx) }));
  const lines = matches.map(({ row, match }) => ({
    import_id: importId,
    booking_id: match.bookingId,
    property_id: match.propertyId,
    platform: row.platform,
    line_type: row.lineType,
    confirmation_code: row.confirmationCode,
    guest_name: row.guestName,
    listing_text: row.listingText,
    listing_ref: row.listingId,
    checkin_date: row.checkinDate,
    nights: row.nights,
    payout_date: row.payoutDate,
    amount_cents: row.amountCents,
    currency: row.currency,
    dedupe_key: row.dedupeKey,
  }));

  // Lines already imported from an earlier upload are left alone, so
  // re-importing an overlapping export only adds what's new.
  const { data: inserted, error: insertError } = await supabase
    .from("payout_lines")
    .upsert(lines, { onConflict: "organization_id,dedupe_key", ignoreDuplicates: true })
    .select("dedupe_key, booking_id, property_id");
  if (insertError) {
    await supabase.from("payout_imports").delete().eq("id", importId);
    throw new Error(insertError.message);
  }

  const insertedKeys = new Set((inserted ?? []).map((l) => l.dedupe_key as string));
  result.imported = insertedKeys.size;
  result.duplicates = lines.length - insertedKeys.size;
  for (const l of inserted ?? []) {
    if (l.booking_id) result.matchedToBooking++;
    else if (l.property_id) result.matchedToPropertyOnly++;
    else result.unmatched++;
  }

  // Fill in what the booking is missing: the platform's confirmation
  // code, and the guest's name (never overwriting a name already there).
  const bookingUpdates = new Map<string, { confirmation_code?: string; guests?: string }>();
  for (const { row, match } of matches) {
    if (!match.bookingId || !insertedKeys.has(row.dedupeKey)) continue;
    const booking = bookingById.get(match.bookingId);
    if (!booking) continue;
    const update = bookingUpdates.get(booking.id) ?? {};
    if (!booking.confirmation_code && row.confirmationCode) update.confirmation_code = row.confirmationCode;
    if (!booking.guests.trim() && row.guestName && !update.guests) update.guests = row.guestName;
    if (Object.keys(update).length > 0) bookingUpdates.set(booking.id, update);
  }
  for (const [id, update] of bookingUpdates) {
    const { error } = await supabase.from("bookings").update(update).eq("id", id);
    if (!error && update.guests) result.guestNamesFilled++;
  }

  await supabase
    .from("payout_imports")
    .update({ rows_imported: result.imported, rows_matched: result.matchedToBooking, rows_duplicate: result.duplicates })
    .eq("id", importId);

  revalidatePath("/payouts");
  revalidatePath("/calendar");
  return result;
}

export interface AssignPayoutLineInput {
  propertyId: string;
  bookingId: string | null;
  rememberListing: boolean;
}

export async function assignPayoutLine(lineId: string, input: AssignPayoutLineInput) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);

  const { data: line, error: lineError } = await supabase
    .from("payout_lines")
    .select("id, platform, listing_text, listing_ref, confirmation_code, guest_name")
    .eq("id", lineId)
    .maybeSingle();
  if (lineError) throw new Error(lineError.message);
  if (!line) throw new Error("That payout line no longer exists.");

  const { error } = await supabase
    .from("payout_lines")
    .update({ property_id: input.propertyId, booking_id: input.bookingId, match_status: "unmatched" })
    .eq("id", lineId);
  if (error) throw new Error(error.message);

  if (input.bookingId) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, guests, confirmation_code")
      .eq("id", input.bookingId)
      .maybeSingle();
    if (booking) {
      const update: { guests?: string; confirmation_code?: string } = {};
      if (!booking.guests?.trim() && line.guest_name) update.guests = line.guest_name;
      if (!booking.confirmation_code && line.confirmation_code) update.confirmation_code = line.confirmation_code;
      if (Object.keys(update).length > 0) await supabase.from("bookings").update(update).eq("id", booking.id);
    }
  }

  // Teach the property this listing, so the next import from the same
  // listing matches automatically.
  if (input.rememberListing) {
    const identifier = (line.listing_ref || line.listing_text || "").trim();
    if (identifier) {
      const { error: listingError } = await supabase.from("property_platform_listings").insert({
        property_id: input.propertyId,
        platform: PLATFORM_DISPLAY_NAME[line.platform as Platform] ?? "Other",
        identifier,
      });
      // 23505 = already on file (for this or another property): nothing
      // new to learn, and the line itself is already placed.
      if (listingError && listingError.code !== "23505") throw new Error(listingError.message);
      if (!listingError) {
        // Other lines from the same listing can now be placed too.
        await rematchUnmatchedLines(supabase);
      }
    }
  }

  revalidatePath("/payouts");
  revalidatePath("/clients");
}

// Re-runs matching for every line still without a property -- after a
// listing name is learned, or after properties' listing names change.
async function rematchUnmatchedLines(supabase: SupabaseClient): Promise<number> {
  const access = await requireStatementsAccess(supabase);
  const { data: open } = await supabase
    .from("payout_lines")
    .select("id, platform, line_type, confirmation_code, guest_name, listing_text, listing_ref, checkin_date, nights, payout_date, amount_cents, currency")
    .eq("match_status", "unmatched");
  if (!open || open.length === 0) return 0;

  const codes: string[] = Array.from(new Set(open.map((l) => l.confirmation_code as string).filter(Boolean)));
  const checkins: string[] = Array.from(
    new Set(open.map((l) => l.checkin_date as string | null).filter((d): d is string => Boolean(d))),
  );
  const { bookings, properties } = await loadMatchData(supabase, access.organizationId, codes, checkins);
  const ctx = buildMatchContext(bookings, properties);

  let placed = 0;
  for (const l of open) {
    const match = matchPayoutRow(
      {
        rowNumber: 0,
        platform: l.platform,
        lineType: l.line_type,
        confirmationCode: l.confirmation_code,
        guestName: l.guest_name,
        listingText: l.listing_text,
        listingId: l.listing_ref,
        checkinDate: l.checkin_date,
        nights: l.nights,
        payoutDate: l.payout_date,
        amountCents: l.amount_cents,
        currency: l.currency,
        dedupeKey: "",
      },
      ctx,
    );
    if (!match.propertyId) continue;
    const { error } = await supabase
      .from("payout_lines")
      .update({ property_id: match.propertyId, booking_id: match.bookingId })
      .eq("id", l.id);
    if (!error) placed++;
  }
  return placed;
}

export async function rematchPayoutLines() {
  const supabase = await createClient();
  const placed = await rematchUnmatchedLines(supabase);
  revalidatePath("/payouts");
  return placed;
}

export async function setPayoutLineIgnored(lineId: string, ignored: boolean) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  // The trigger recalculates the real status when 'unmatched' is sent.
  const { error } = await supabase
    .from("payout_lines")
    .update({ match_status: ignored ? "ignored" : "unmatched" })
    .eq("id", lineId);
  if (error) throw new Error(error.message);
  revalidatePath("/payouts");
}

export async function undoPayoutImport(importId: string) {
  const supabase = await createClient();
  await requireStatementsAccess(supabase);
  // Its lines go with it (on delete cascade). Guest names and codes it
  // filled in on bookings are kept -- they're still correct.
  const { error } = await supabase.from("payout_imports").delete().eq("id", importId);
  if (error) throw new Error(error.message);
  revalidatePath("/payouts");
}
