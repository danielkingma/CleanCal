"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import StatementDocument from "./StatementDocument";
import { addOwnerExpense, deleteOwnerExpense, saveStatement } from "@/app/statements/actions";
import { dollarsToCents, formatCents } from "@/lib/money";
import { FY_REGIONS, fyLabel, fyLabelFromDates, periodRange, type FYRegion, type StatementSnapshot } from "@/lib/statements";
import type { PropertyOwner } from "@/lib/types";

export interface SavedStatement {
  id: string;
  period_start: string;
  period_end: string;
  share_enabled: boolean;
  updated_at: string;
}

interface Props {
  owners: PropertyOwner[];
  ownerId: string;
  month: string;
  region: FYRegion;
  currentFY: number;
  snapshot: StatementSnapshot | null;
  expenses: { id: string; property_id: string; expense_date: string; description: string; amount_cents: number }[];
  properties: { id: string; name: string }[];
  saved: SavedStatement[];
  isSuperadmin?: boolean;
}

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

// "July 2026" for a month, "FY 2025–26" for a financial year.
function periodLabel(start: string, end: string): string {
  const startMonth = start.slice(0, 7);
  if (startMonth === end.slice(0, 7)) return monthLabel(start);
  return fyLabelFromDates(start, end);
}

export default function StatementsView({ owners, ownerId, month, region, currentFY, snapshot, expenses, properties, saved, isSuperadmin }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expProp, setExpProp] = useState("");
  const range = periodRange(month, region)!;
  const isFY = range.kind === "fy";
  const [expDateRaw, setExpDate] = useState(range.start);
  // Keep the date inside the period being viewed when the period changes.
  const expDate = expDateRaw >= range.start && expDateRaw <= range.end ? expDateRaw : range.start;
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");

  function go(nextOwner: string, nextMonth: string, nextRegion: FYRegion = region) {
    try {
      document.cookie = `stmt_region=${nextRegion}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // The URL still carries the choice.
    }
    router.push(`/statements?owner=${nextOwner}&month=${nextMonth}&region=${nextRegion}`);
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddExpense() {
    const cents = dollarsToCents(expAmount);
    if (cents === null || Number.isNaN(cents)) {
      setError("Enter the amount, like 45 or 45.50.");
      return;
    }
    await run(async () => {
      await addOwnerExpense({
        property_id: expProp || properties[0]?.id || "",
        expense_date: expDate,
        description: expDesc,
        amount_cents: cents,
      });
      setExpDesc("");
      setExpAmount("");
    });
  }

  const propName = Object.fromEntries(properties.map((p) => [p.id, p.name]));
  const savedThisMonth = saved.find((s) => s.period_start === range.start && s.period_end === range.end);
  const fyOptions = [currentFY, currentFY - 1, currentFY - 2, currentFY - 3];
  const todayMonth = new Date().toISOString().slice(0, 7);
  const currentYearFor = (r: FYRegion) => {
    const t = new Date().toISOString().slice(0, 10);
    const rr = FY_REGIONS[r];
    const y = Number(t.slice(0, 4));
    return t >= `${y}-${String(rr.startMonth).padStart(2, "0")}-${String(rr.startDay).padStart(2, "0")}` ? y : y - 1;
  };

  return (
    <div>
      <div className="topbar no-print">
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <SignOutButton />
        </div>
        <div className="topbar-row">
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Owner statements</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser isSuperadmin={isSuperadmin} statementsEnabled />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        {owners.length === 0 ? (
          <div className="property-card" style={{ maxWidth: 760 }}>
            <p style={{ margin: 0 }}>
              Add a client first, and assign their properties with a fee, in{" "}
              <Link href="/clients">Clients &amp; fees</Link>. Then import payouts on{" "}
              <Link href="/payouts">Payouts</Link>.
            </p>
          </div>
        ) : (
          <>
            <div className="property-card no-print" style={{ maxWidth: 820 }}>
              <div className="filter-row">
                <div className="field">
                  <label htmlFor="stmtOwner">Client</label>
                  <select id="stmtOwner" value={ownerId} onChange={(e) => go(e.target.value, month)}>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="stmtKind">Period</label>
                  <select
                    id="stmtKind"
                    value={isFY ? "fy" : "month"}
                    onChange={(e) => go(ownerId, e.target.value === "fy" ? `fy${currentFY}` : todayMonth)}
                  >
                    <option value="month">Month</option>
                    <option value="fy">Financial / tax year</option>
                  </select>
                </div>
                {isFY ? (
                  <>
                    <div className="field">
                      <label htmlFor="stmtRegion">Country</label>
                      <select
                        id="stmtRegion"
                        value={region}
                        onChange={(e) => {
                          const r = e.target.value as FYRegion;
                          go(ownerId, `fy${currentYearFor(r)}`, r);
                        }}
                      >
                        {(Object.keys(FY_REGIONS) as FYRegion[]).map((r) => (
                          <option key={r} value={r}>
                            {FY_REGIONS[r].name} ({FY_REGIONS[r].note})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="stmtFY">Year</label>
                      <select id="stmtFY" value={month} onChange={(e) => go(ownerId, e.target.value)}>
                        {fyOptions.map((y) => (
                          <option key={y} value={`fy${y}`}>
                            {fyLabel(y, region)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="field">
                    <label htmlFor="stmtMonth">Month</label>
                    <input id="stmtMonth" type="month" value={month} onChange={(e) => e.target.value && go(ownerId, e.target.value)} />
                  </div>
                )}
              </div>
              <p className="access-note" style={{ marginBottom: 0 }}>
                Worked out live from imported payouts, your cleaning jobs, each property&apos;s fee settings and the
                expenses below. Save it to freeze a copy you can print or send.
              </p>
            </div>

            {error ? (
              <p className="error-msg no-print" style={{ maxWidth: 820 }}>
                {error}
              </p>
            ) : null}

            {snapshot ? <StatementDocument s={snapshot} /> : null}

            <div className="property-card no-print" style={{ maxWidth: 820, marginTop: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !snapshot}
                  onClick={() =>
                    run(async () => {
                      const id = await saveStatement(ownerId, month, region);
                      router.push(`/statements/${id}`);
                    })
                  }
                >
                  {savedThisMonth ? "Re-save (replaces the saved copy)" : "Save statement"}
                </button>
                {savedThisMonth ? <Link href={`/statements/${savedThisMonth.id}`}>Open saved copy</Link> : null}
              </div>
            </div>

            {properties.length > 0 ? (
              <div className="property-card no-print" style={{ maxWidth: 820, marginTop: 16 }}>
                <h3 style={{ marginTop: 0 }}>Expenses for {periodLabel(range.start, range.end)}</h3>
                {expenses.length === 0 ? (
                  <p className="access-note">None in this period.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                    {expenses.map((e) => (
                      <li
                        key={e.id}
                        style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: "1px solid var(--line)", padding: "6px 0" }}
                      >
                        <span>
                          {e.expense_date} · {propName[e.property_id]} · {e.description}
                        </span>
                        <span>
                          {formatCents(e.amount_cents)}{" "}
                          <button type="button" className="btn" disabled={busy} onClick={() => run(() => deleteOwnerExpense(e.id))}>
                            Remove
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="filter-row">
                  <div className="field">
                    <label htmlFor="expProp">Property</label>
                    <select id="expProp" value={expProp || properties[0].id} onChange={(e) => setExpProp(e.target.value)}>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="expDate">Date</label>
                    <input id="expDate" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 2 }}>
                    <label htmlFor="expDesc">What for</label>
                    <input id="expDesc" type="text" value={expDesc} placeholder="Replacement kettle" onChange={(e) => setExpDesc(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="expAmt">Amount ($)</label>
                    <input id="expAmt" type="text" inputMode="decimal" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="btn" disabled={busy || !expDesc.trim()} onClick={handleAddExpense}>
                  Add expense
                </button>
              </div>
            ) : null}

            {saved.length > 0 ? (
              <div className="property-card no-print" style={{ maxWidth: 820, marginTop: 16 }}>
                <h3 style={{ marginTop: 0 }}>Saved statements</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {saved.map((s) => (
                    <li key={s.id} style={{ borderTop: "1px solid var(--line)", padding: "6px 0" }}>
                      <Link href={`/statements/${s.id}`}>{periodLabel(s.period_start, s.period_end)}</Link>
                      {s.share_enabled ? " · owner link on" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
