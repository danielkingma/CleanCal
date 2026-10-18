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
import type { StatementSnapshot } from "@/lib/statements";
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
  snapshot: StatementSnapshot | null;
  expenses: { id: string; property_id: string; expense_date: string; description: string; amount_cents: number }[];
  properties: { id: string; name: string }[];
  saved: SavedStatement[];
  isSuperadmin?: boolean;
}

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default function StatementsView({ owners, ownerId, month, snapshot, expenses, properties, saved, isSuperadmin }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expProp, setExpProp] = useState("");
  const [expDate, setExpDate] = useState(`${month}-01`);
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");

  function go(nextOwner: string, nextMonth: string) {
    router.push(`/statements?owner=${nextOwner}&month=${nextMonth}`);
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
  const savedThisMonth = saved.find((s) => s.period_start === `${month}-01`);

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
                  <label htmlFor="stmtMonth">Month</label>
                  <input id="stmtMonth" type="month" value={month} onChange={(e) => e.target.value && go(ownerId, e.target.value)} />
                </div>
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
                      const id = await saveStatement(ownerId, month);
                      router.push(`/statements/${id}`);
                    })
                  }
                >
                  {savedThisMonth ? "Re-save this month (replaces the saved copy)" : "Save statement"}
                </button>
                {savedThisMonth ? <Link href={`/statements/${savedThisMonth.id}`}>Open saved copy</Link> : null}
              </div>
            </div>

            {properties.length > 0 ? (
              <div className="property-card no-print" style={{ maxWidth: 820, marginTop: 16 }}>
                <h3 style={{ marginTop: 0 }}>Expenses for {monthLabel(`${month}-01`)}</h3>
                {expenses.length === 0 ? (
                  <p className="access-note">None this month.</p>
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
                      <Link href={`/statements/${s.id}`}>{monthLabel(s.period_start)}</Link>
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
