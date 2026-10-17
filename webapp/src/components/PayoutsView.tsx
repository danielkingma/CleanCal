"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import {
  assignPayoutLine,
  importPayouts,
  rematchPayoutLines,
  setPayoutLineIgnored,
  undoPayoutImport,
  type ImportPayoutsResult,
} from "@/app/payouts/actions";
import { formatCents } from "@/lib/money";
import type { DateOrder, Platform } from "@/lib/payout-import";
import type { PayoutImport, PayoutLine, PayoutLineType, PayoutPlatform, Property } from "@/lib/types";

export interface BookingOption {
  id: string;
  property_id: string;
  checkin_date: string;
  nights: number;
  guests: string;
  platform_label: string | null;
}

interface PayoutsViewProps {
  imports: PayoutImport[];
  openLines: PayoutLine[];
  ignoredLines: PayoutLine[];
  properties: Property[];
  bookingOptions: BookingOption[];
  isSuperadmin?: boolean;
}

// Server actions accept roughly 1 MB; a month of payouts is far smaller.
const MAX_FILE_BYTES = 900_000;

const PLATFORM_LABEL: Record<PayoutPlatform, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  other: "Other",
};

const LINE_TYPE_LABEL: Record<PayoutLineType, string> = {
  reservation: "Reservation",
  adjustment: "Adjustment",
  cancellation_fee: "Cancellation fee",
  other: "Other",
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function dayDiff(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

export default function PayoutsView({
  imports,
  openLines,
  ignoredLines,
  properties,
  bookingOptions,
  isSuperadmin = false,
}: PayoutsViewProps) {
  const propertyName = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p.name])), [properties]);

  // ---- Import ----
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<Platform | "auto">("auto");
  const [dateOrder, setDateOrder] = useState<DateOrder>("auto");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPayoutsResult | null>(null);

  async function handleImport() {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setImportError("That file is too large to import in one go. Export one month at a time and import each.");
      return;
    }
    setImporting(true);
    setImportError(null);
    setResult(null);
    try {
      const text = await file.text();
      setResult(await importPayouts({ fileName: file.name, text, platform, dateOrder }));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Couldn't import that file.");
    } finally {
      setImporting(false);
    }
  }

  // ---- Review ----
  const unmatched = openLines.filter((l) => l.match_status === "unmatched");
  const propertyOnly = openLines.filter((l) => l.match_status === "property_only");
  const [choices, setChoices] = useState<Record<string, { propertyId: string; bookingId: string; remember: boolean }>>({});
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);
  const [rematchNote, setRematchNote] = useState<string | null>(null);

  function defaultChoice(line: PayoutLine) {
    return { propertyId: line.property_id ?? "", bookingId: "", remember: true };
  }
  function choiceFor(line: PayoutLine) {
    return choices[line.id] ?? defaultChoice(line);
  }
  function setChoice(line: PayoutLine, patch: Partial<{ propertyId: string; bookingId: string; remember: boolean }>) {
    setChoices((prev) => {
      const current = prev[line.id] ?? defaultChoice(line);
      const next = { ...current, ...patch };
      // A different property means the chosen booking no longer applies.
      if (patch.propertyId !== undefined && patch.propertyId !== current.propertyId) next.bookingId = "";
      return { ...prev, [line.id]: next };
    });
  }

  // The closest bookings at the chosen property to this line's check-in
  // (or payout date, for lines without one), nearest first.
  function bookingsFor(line: PayoutLine, propertyId: string): BookingOption[] {
    if (!propertyId) return [];
    const anchor = line.checkin_date ?? line.payout_date;
    const list = bookingOptions.filter((b) => b.property_id === propertyId);
    if (!anchor) return list.slice(-12);
    return [...list].sort((a, b) => dayDiff(a.checkin_date, anchor) - dayDiff(b.checkin_date, anchor)).slice(0, 12);
  }

  async function handleAssign(line: PayoutLine) {
    const c = choiceFor(line);
    if (!c.propertyId) return;
    setBusyLineId(line.id);
    setReviewError(null);
    try {
      await assignPayoutLine(line.id, {
        propertyId: c.propertyId,
        bookingId: c.bookingId || null,
        rememberListing: c.remember && line.match_status === "unmatched",
      });
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusyLineId(null);
    }
  }

  async function handleIgnore(line: PayoutLine, ignored: boolean) {
    setBusyLineId(line.id);
    setReviewError(null);
    try {
      await setPayoutLineIgnored(line.id, ignored);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusyLineId(null);
    }
  }

  async function handleRematch() {
    setRematching(true);
    setRematchNote(null);
    setReviewError(null);
    try {
      const placed = await rematchPayoutLines();
      setRematchNote(placed === 0 ? "No new matches found." : `Placed ${placed} ${placed === 1 ? "line" : "lines"}.`);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Couldn't re-run matching.");
    } finally {
      setRematching(false);
    }
  }

  // ---- Imports list ----
  const [undoingId, setUndoingId] = useState<string | null>(null);
  async function handleUndo(imp: PayoutImport) {
    if (!window.confirm(`Undo the import of "${imp.file_name || "this file"}"? Its ${imp.rows_imported} payout lines will be removed.`)) {
      return;
    }
    setUndoingId(imp.id);
    try {
      await undoPayoutImport(imp.id);
      if (result?.importId === imp.id) setResult(null);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Couldn't undo that import.");
    } finally {
      setUndoingId(null);
    }
  }

  function lineSummary(line: PayoutLine) {
    return (
      <>
        <div style={{ fontWeight: 500 }}>
          {formatCents(line.amount_cents, line.currency)}{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12.5 }}>
            {PLATFORM_LABEL[line.platform]} · {LINE_TYPE_LABEL[line.line_type]} · paid {shortDate(line.payout_date)}
          </span>
        </div>
        <div style={{ fontSize: 13 }}>
          {line.guest_name || "Guest not given"}
          {line.checkin_date ? ` · check-in ${shortDate(line.checkin_date)}` : ""}
          {line.nights ? ` · ${line.nights} ${line.nights === 1 ? "night" : "nights"}` : ""}
          {line.confirmation_code ? ` · ${line.confirmation_code}` : ""}
        </div>
        {line.listing_text || line.listing_ref ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            Listing: {line.listing_text}
            {line.listing_ref ? ` (ID ${line.listing_ref})` : ""}
          </div>
        ) : null}
      </>
    );
  }

  function reviewRow(line: PayoutLine) {
    const c = choiceFor(line);
    const options = bookingsFor(line, c.propertyId);
    const canRemember = line.match_status === "unmatched" && Boolean(line.listing_text || line.listing_ref);
    return (
      <li key={line.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 10 }}>
        {lineSummary(line)}
        <div className="filter-row" style={{ marginTop: 8 }}>
          {line.match_status === "unmatched" ? (
            <div className="field">
              <label htmlFor={`prop-${line.id}`}>Property</label>
              <select
                id={`prop-${line.id}`}
                value={c.propertyId}
                onChange={(e) => setChoice(line, { propertyId: e.target.value })}
              >
                <option value="">Choose…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field">
              <label>Property</label>
              <div style={{ paddingTop: 6 }}>{propertyName[line.property_id ?? ""] ?? "—"}</div>
            </div>
          )}
          <div className="field">
            <label htmlFor={`booking-${line.id}`}>Booking (optional)</label>
            <select
              id={`booking-${line.id}`}
              value={c.bookingId}
              disabled={!c.propertyId}
              onChange={(e) => setChoice(line, { bookingId: e.target.value })}
            >
              <option value="">{options.length === 0 ? "No bookings nearby" : "No booking"}</option>
              {options.map((b) => (
                <option key={b.id} value={b.id}>
                  {shortDate(b.checkin_date)} · {b.nights}n{b.guests ? ` · ${b.guests}` : ""}
                  {b.platform_label ? ` · ${b.platform_label}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busyLineId === line.id || !c.propertyId || (line.match_status === "property_only" && !c.bookingId)}
            onClick={() => handleAssign(line)}
          >
            {line.match_status === "unmatched" ? "Save" : "Link booking"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busyLineId === line.id}
            onClick={() => handleIgnore(line, true)}
          >
            Ignore
          </button>
          {canRemember ? (
            <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={c.remember}
                onChange={(e) => setChoice(line, { remember: e.target.checked })}
              />
              Remember this listing for next time
            </label>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <SignOutButton />
        </div>
        <div className="topbar-row">
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Payouts</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser isSuperadmin={isSuperadmin} statementsEnabled />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <div className="property-card" style={{ maxWidth: 760 }}>
          <h3 style={{ marginTop: 0 }}>Import a payout export</h3>
          <p className="access-note" style={{ marginTop: 0 }}>
            Airbnb: Earnings → Transaction history → export CSV. Booking.com: export reservations or payouts from the
            extranet as CSV. Importing the same file twice won&apos;t double anything.
          </p>
          <div className="filter-row">
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="payoutFile">CSV file</label>
              <input
                id="payoutFile"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setResult(null);
                  setImportError(null);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="payoutPlatform">Platform</label>
              <select id="payoutPlatform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform | "auto")}>
                <option value="auto">Detect automatically</option>
                <option value="airbnb">Airbnb</option>
                <option value="booking_com">Booking.com</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="payoutDates">Dates in file</label>
              <select id="payoutDates" value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
                <option value="auto">Detect automatically</option>
                <option value="dmy">Day/month/year</option>
                <option value="mdy">Month/day/year</option>
              </select>
            </div>
          </div>
          {importError ? <div className="error-banner">{importError}</div> : null}
          <button type="button" className="btn btn-primary" disabled={!file || importing} onClick={handleImport}>
            {importing ? "Importing…" : "Import"}
          </button>

          {result ? (
            <div style={{ marginTop: 14 }}>
              <div className="info-banner" style={{ marginBottom: 8 }}>
                {result.imported === 0 && result.duplicates > 0
                  ? `Nothing new — all ${result.duplicates} lines were already imported.`
                  : `Imported ${result.imported} ${result.imported === 1 ? "line" : "lines"} from ${PLATFORM_LABEL[result.platform]}: ` +
                    `${result.matchedToBooking} matched to a booking, ${result.matchedToPropertyOnly} to a property only, ` +
                    `${result.unmatched} need a property.` +
                    (result.duplicates > 0 ? ` ${result.duplicates} already imported earlier.` : "") +
                    (result.guestNamesFilled > 0
                      ? ` Added ${result.guestNamesFilled} guest ${result.guestNamesFilled === 1 ? "name" : "names"} to the calendar.`
                      : "")}
              </div>
              {result.warnings.map((w) => (
                <div key={w} className="access-note" style={{ marginBottom: 4 }}>
                  {w}
                </div>
              ))}
              {result.skipped.length > 0 ? (
                <details style={{ fontSize: 13 }}>
                  <summary>
                    {result.skipped.length} {result.skipped.length === 1 ? "row" : "rows"} skipped
                  </summary>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {result.skipped.slice(0, 50).map((s) => (
                      <li key={s.rowNumber}>
                        Row {s.rowNumber}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="property-card" style={{ maxWidth: 760, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Needs a property{unmatched.length > 0 ? ` — ${unmatched.length}` : ""}</h3>
            {unmatched.length > 0 ? (
              <button type="button" className="btn btn-secondary" disabled={rematching} onClick={handleRematch}>
                {rematching ? "Matching…" : "Re-run matching"}
              </button>
            ) : null}
          </div>
          {reviewError ? <div className="error-banner" style={{ marginTop: 10 }}>{reviewError}</div> : null}
          {rematchNote ? <div className="access-note" style={{ marginTop: 6 }}>{rematchNote}</div> : null}
          {unmatched.length === 0 ? (
            <p className="access-note">
              Every imported line has a property. Lines are matched by confirmation code, or by listing name and
              check-in date — set listing names on <Link href="/clients">Clients &amp; fees</Link> to match more
              automatically.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{unmatched.map(reviewRow)}</ul>
          )}
        </div>

        {propertyOnly.length > 0 ? (
          <div className="property-card" style={{ maxWidth: 760, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Not linked to a booking — {propertyOnly.length}</h3>
            <p className="access-note" style={{ marginTop: 0 }}>
              These already count toward the property&apos;s owner statement. Linking a booking adds the guest and
              nights, and fills the guest name on the calendar.
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{propertyOnly.map(reviewRow)}</ul>
          </div>
        ) : null}

        {ignoredLines.length > 0 ? (
          <div className="property-card" style={{ maxWidth: 760, marginTop: 16 }}>
            <details>
              <summary style={{ fontWeight: 600 }}>Ignored lines — {ignoredLines.length}</summary>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {ignoredLines.map((line) => (
                  <li key={line.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 10 }}>
                    {lineSummary(line)}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: 6 }}
                      disabled={busyLineId === line.id}
                      onClick={() => handleIgnore(line, false)}
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}

        <div className="property-card" style={{ maxWidth: 760, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Recent imports</h3>
          {imports.length === 0 ? (
            <p className="access-note">No imports yet.</p>
          ) : (
            <table className="feed-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Platform</th>
                  <th>Imported</th>
                  <th>Lines</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr key={imp.id}>
                    <td style={{ wordBreak: "break-word" }}>{imp.file_name || "—"}</td>
                    <td>{PLATFORM_LABEL[imp.platform]}</td>
                    <td>{new Date(imp.created_at).toLocaleDateString("en-AU")}</td>
                    <td>
                      {imp.rows_imported}
                      {imp.rows_duplicate > 0 ? ` (+${imp.rows_duplicate} dup.)` : ""}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={undoingId === imp.id}
                        onClick={() => handleUndo(imp)}
                      >
                        Undo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
