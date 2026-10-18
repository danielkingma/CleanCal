import { formatCents } from "@/lib/money";
import type { StatementSnapshot } from "@/lib/statements";

function day(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// The statement itself: used for the on-screen preview, the saved
// statement's printable page, and the private owner link. Presentational
// only, so it works in server and client components alike.
export default function StatementDocument({ s }: { s: StatementSnapshot }) {
  const money = (c: number) => formatCents(c, s.currency);
  return (
    <article className="stmt-doc">
      <header className="stmt-head">
        <div>
          <div className="stmt-kicker">Owner statement</div>
          <h2 style={{ margin: "2px 0 0" }}>{s.client_name}</h2>
        </div>
        <div className="stmt-period">
          {day(s.period_start)} – {day(s.period_end)}
          {s.organization_name ? <div>Prepared by {s.organization_name}</div> : null}
        </div>
      </header>

      <table className="stmt-table stmt-summary">
        <tbody>
          <tr>
            <td>Platform payouts</td>
            <td className="stmt-num">{money(s.payouts_cents)}</td>
          </tr>
          <tr>
            <td>Cleaning</td>
            <td className="stmt-num">−{money(s.cleaning_cents)}</td>
          </tr>
          <tr>
            <td>Management fee</td>
            <td className="stmt-num">−{money(s.fee_cents)}</td>
          </tr>
          <tr>
            <td>Expenses</td>
            <td className="stmt-num">−{money(s.expenses_cents)}</td>
          </tr>
          <tr className="stmt-total">
            <td>Net to owner</td>
            <td className="stmt-num">{money(s.net_cents)}</td>
          </tr>
        </tbody>
      </table>

      {s.months && s.months.length > 1 ? (
        <section className="stmt-prop">
          <h3>Month by month</h3>
          <table className="stmt-table stmt-months">
            <thead>
              <tr>
                <th>Month</th>
                <th className="stmt-num">Payouts</th>
                <th className="stmt-num">Cleaning</th>
                <th className="stmt-num">Fee</th>
                <th className="stmt-num">Expenses</th>
                <th className="stmt-num">Net</th>
              </tr>
            </thead>
            <tbody>
              {s.months.map((m) => (
                <tr key={m.month}>
                  <td>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</td>
                  <td className="stmt-num">{money(m.payouts_cents)}</td>
                  <td className="stmt-num">{money(m.cleaning_cents)}</td>
                  <td className="stmt-num">{money(m.fee_cents)}</td>
                  <td className="stmt-num">{money(m.expenses_cents)}</td>
                  <td className="stmt-num">{money(m.net_cents)}</td>
                </tr>
              ))}
              <tr className="stmt-total">
                <td>Total</td>
                <td className="stmt-num">{money(s.payouts_cents)}</td>
                <td className="stmt-num">{money(s.cleaning_cents)}</td>
                <td className="stmt-num">{money(s.fee_cents)}</td>
                <td className="stmt-num">{money(s.expenses_cents)}</td>
                <td className="stmt-num">{money(s.net_cents)}</td>
              </tr>
            </tbody>
          </table>
          <p className="stmt-none">
            A summary of the figures in your records for the period, to give to an accountant or use when preparing a
            tax return. It is not tax advice, and GST is not calculated.
          </p>
        </section>
      ) : null}

      {s.properties.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>This client has no properties assigned yet.</p>
      ) : null}

      {s.properties.map((p) => (
        <section key={p.property_id} className="stmt-prop">
          <h3>{p.property_name}</h3>

          <h4>Payouts</h4>
          {p.payouts.length === 0 ? (
            <p className="stmt-none">No payouts in this period.</p>
          ) : (
            <table className="stmt-table">
              <tbody>
                {p.payouts.map((r, i) => (
                  <tr key={i}>
                    <td>{day(r.date)}</td>
                    <td>
                      {r.guest || "Guest not given"}
                      <span className="stmt-sub">{r.detail}</span>
                    </td>
                    <td className="stmt-num">{money(r.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4>Cleaning</h4>
          {p.cleaning.length === 0 ? (
            <p className="stmt-none">No cleans in this period.</p>
          ) : (
            <table className="stmt-table">
              <tbody>
                {p.cleaning.map((r, i) => (
                  <tr key={i}>
                    <td>{day(r.date)}</td>
                    <td>
                      Turnover clean{r.guest ? ` after ${r.guest}` : ""}
                      {r.linen ? <span className="stmt-sub">Includes linen service</span> : null}
                    </td>
                    <td className="stmt-num">−{money(r.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {p.expenses.length > 0 ? (
            <>
              <h4>Expenses</h4>
              <table className="stmt-table">
                <tbody>
                  {p.expenses.map((r, i) => (
                    <tr key={i}>
                      <td>{day(r.date)}</td>
                      <td>{r.description}</td>
                      <td className="stmt-num">−{money(r.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          <table className="stmt-table stmt-prop-total">
            <tbody>
              <tr>
                <td>
                  Management fee ({p.mgmt_fee_percent}% of {p.fee_basis === "gross" ? "payouts" : "payouts after cleaning"})
                </td>
                <td className="stmt-num">−{money(p.fee_cents)}</td>
              </tr>
              <tr className="stmt-total">
                <td>{p.property_name} net</td>
                <td className="stmt-num">{money(p.net_cents)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ))}
    </article>
  );
}
