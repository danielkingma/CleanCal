"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { Booking, Profile, Property } from "@/lib/types";

interface ReportsViewProps {
  completed: Booking[];
  properties: Property[];
  profiles: Profile[];
  isSuperadmin?: boolean;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Minutes between cleaning_started_at/cleaning_completed_at -- both are
// only ever stamped by a cleaner's own phone (see cleaner_update_booking,
// 0033_cleaning_duration_tracking.sql), so this is null for any booking
// completed before that existed, or completed via a staff override.
function durationMinutes(b: Booking): number | null {
  if (!b.cleaning_started_at || !b.cleaning_completed_at) return null;
  const ms = new Date(b.cleaning_completed_at).getTime() - new Date(b.cleaning_started_at).getTime();
  return ms > 0 ? ms / 60000 : null;
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}m`;
  return `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// What this booking cost to turn over, at the property's *current*
// payout rate and linen fee -- not necessarily what was actually paid
// out at the time, since either can change. Null if the property has no
// payout rate configured at all.
function estimatedCostCents(b: Booking, property: Property | undefined): number | null {
  if (!property?.payout_rate_cents) return null;
  const linenCents = b.linen_pickup ? (property.linen_box_count ?? 0) * (property.linen_fee_cents ?? 0) : 0;
  return property.payout_rate_cents + linenCents;
}

export default function ReportsView({ completed, properties, profiles, isSuperadmin = false }: ReportsViewProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");

  const propertyNameById = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.name])),
    [properties],
  );
  const propertyById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);
  const cleanerNameById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p.name])), [profiles]);

  const filtered = useMemo(() => {
    return completed.filter((b) => {
      if (from && b.checkin_date < from) return false;
      if (to && b.checkin_date > to) return false;
      if (propertyId && b.property_id !== propertyId) return false;
      if (cleanerId && b.assigned_cleaner_id !== cleanerId) return false;
      return true;
    });
  }, [completed, from, to, propertyId, cleanerId]);

  const totalNights = filtered.reduce((sum, b) => sum + b.nights, 0);
  const rated = filtered.filter((b) => b.rating != null);
  const avgRating = rated.length ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length : null;
  const disputeCount = filtered.filter((b) => b.dispute_status !== "none").length;

  const byProperty = useMemo(() => {
    const map = new Map<
      string,
      { count: number; nights: number; ratingSum: number; ratingCount: number; costSum: number; costCount: number }
    >();
    for (const b of filtered) {
      const entry = map.get(b.property_id) ?? { count: 0, nights: 0, ratingSum: 0, ratingCount: 0, costSum: 0, costCount: 0 };
      entry.count += 1;
      entry.nights += b.nights;
      if (b.rating != null) {
        entry.ratingSum += b.rating;
        entry.ratingCount += 1;
      }
      const cost = estimatedCostCents(b, propertyById[b.property_id]);
      if (cost != null) {
        entry.costSum += cost;
        entry.costCount += 1;
      }
      map.set(b.property_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: propertyNameById[id] ?? "—",
        count: v.count,
        nights: v.nights,
        avgRating: v.ratingCount ? v.ratingSum / v.ratingCount : null,
        avgCostCents: v.costCount ? v.costSum / v.costCount : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, propertyNameById, propertyById]);

  const byCleaner = useMemo(() => {
    const map = new Map<
      string,
      { count: number; ratingSum: number; ratingCount: number; durationSum: number; durationCount: number }
    >();
    for (const b of filtered) {
      if (!b.assigned_cleaner_id) continue;
      const entry = map.get(b.assigned_cleaner_id) ?? { count: 0, ratingSum: 0, ratingCount: 0, durationSum: 0, durationCount: 0 };
      entry.count += 1;
      if (b.rating != null) {
        entry.ratingSum += b.rating;
        entry.ratingCount += 1;
      }
      const duration = durationMinutes(b);
      if (duration != null) {
        entry.durationSum += duration;
        entry.durationCount += 1;
      }
      map.set(b.assigned_cleaner_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: cleanerNameById[id] ?? "—",
        count: v.count,
        avgRating: v.ratingCount ? v.ratingSum / v.ratingCount : null,
        avgDurationMinutes: v.durationCount ? v.durationSum / v.durationCount : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, cleanerNameById]);

  // Cross-property/cleaner benchmarking -- the two answers "which
  // property costs the most to turn over" and "which cleaner is
  // fastest" don't come for free from the tables above (those stay
  // sorted by volume), so they're called out directly here.
  const priciestProperty = useMemo(
    () =>
      byProperty
        .filter((p) => p.avgCostCents != null)
        .reduce<(typeof byProperty)[number] | null>(
          (max, p) => (max == null || (p.avgCostCents as number) > (max.avgCostCents as number) ? p : max),
          null,
        ),
    [byProperty],
  );
  const fastestCleaner = useMemo(
    () =>
      byCleaner
        .filter((c) => c.avgDurationMinutes != null)
        .reduce<(typeof byCleaner)[number] | null>(
          (min, c) =>
            min == null || (c.avgDurationMinutes as number) < (min.avgDurationMinutes as number) ? c : min,
          null,
        ),
    [byCleaner],
  );

  // Labor trends over time -- the stat tiles above are point-in-time
  // totals for whatever's filtered; this buckets the same filtered set
  // by month so a trend (more/fewer cleans, rating drifting) is visible
  // instead of just one snapshot number.
  const byMonth = useMemo(() => {
    const map = new Map<string, { count: number; ratingSum: number; ratingCount: number }>();
    for (const b of filtered) {
      const key = b.checkin_date.slice(0, 7); // YYYY-MM
      const entry = map.get(key) ?? { count: 0, ratingSum: 0, ratingCount: 0 };
      entry.count += 1;
      if (b.rating != null) {
        entry.ratingSum += b.rating;
        entry.ratingCount += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([month, v]) => ({
        month,
        label: new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        count: v.count,
        avgRating: v.ratingCount ? v.ratingSum / v.ratingCount : null,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);
  const maxMonthCount = Math.max(1, ...byMonth.map((m) => m.count));

  function handleExportCsv() {
    const header = [
      "Property",
      "Guest(s)",
      "Check-in",
      "Nights",
      "Source",
      "Cleaner",
      "Rating",
      "Rating comment",
      "Dispute",
      "Est. cost",
      "Duration (min)",
    ];
    const rows = filtered.map((b) => {
      const cost = estimatedCostCents(b, propertyById[b.property_id]);
      const duration = durationMinutes(b);
      return [
        propertyNameById[b.property_id] ?? "",
        b.guests || "",
        b.checkin_date,
        b.nights,
        b.platform_label || "",
        (b.assigned_cleaner_id && cleanerNameById[b.assigned_cleaner_id]) || "",
        b.rating ?? "",
        b.rating_comment || "",
        b.dispute_status !== "none" ? b.dispute_status : "",
        cost != null ? (cost / 100).toFixed(2) : "",
        duration != null ? Math.round(duration) : "",
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cleancal-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Reports</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={true} isSuperadmin={isSuperadmin} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <div className="property-card" style={{ maxWidth: "none" }}>
          <div className="filter-row">
            <div className="field">
              <label htmlFor="repFrom">From</label>
              <input id="repFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="repTo">To</label>
              <input id="repTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="repProperty">Property</label>
              <select id="repProperty" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="repCleaner">Cleaner</label>
              <select id="repCleaner" value={cleanerId} onChange={(e) => setCleanerId(e.target.value)}>
                <option value="">All cleaners</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={handleExportCsv} disabled={filtered.length === 0}>
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-tile accent-teal">
            <div className="stat-number">{filtered.length}</div>
            <div className="stat-label">Completed cleans</div>
          </div>
          <div className="stat-tile accent-blue">
            <div className="stat-number">{totalNights}</div>
            <div className="stat-label">Nights cleaned</div>
          </div>
          <div className="stat-tile accent-amber">
            <div className="stat-number">{avgRating != null ? avgRating.toFixed(1) : "—"}</div>
            <div className="stat-label">Average rating</div>
          </div>
          <div className="stat-tile accent-coral">
            <div className="stat-number">{disputeCount}</div>
            <div className="stat-label">Disputes</div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-tile accent-coral">
            <div className="stat-number" style={{ fontSize: 20 }}>
              {priciestProperty ? formatCents(priciestProperty.avgCostCents as number) : "—"}
            </div>
            <div className="stat-label">
              Priciest to turn over{priciestProperty ? ` · ${priciestProperty.name}` : ""}
            </div>
          </div>
          <div className="stat-tile accent-teal">
            <div className="stat-number" style={{ fontSize: 20 }}>
              {fastestCleaner ? formatMinutes(fastestCleaner.avgDurationMinutes as number) : "—"}
            </div>
            <div className="stat-label">Fastest cleaner{fastestCleaner ? ` · ${fastestCleaner.name}` : ""}</div>
          </div>
        </div>
        {!fastestCleaner ? (
          <p className="photo-note" style={{ marginTop: -8, marginBottom: 20 }}>
            No duration data yet — cleaning time is only tracked from jobs a cleaner starts and
            finishes from their own phone going forward, not past jobs.
          </p>
        ) : null}

        {byMonth.length > 1 ? (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Trend over time</h2>
            <div className="property-card">
              {byMonth.map((m) => (
                <div key={m.month} className="report-trend-row">
                  <span className="report-trend-label">{m.label}</span>
                  <div className="report-trend-bar-track">
                    <div
                      className="report-trend-bar-fill"
                      style={{ width: `${(m.count / maxMonthCount) * 100}%` }}
                    />
                  </div>
                  <span className="report-trend-value">
                    {m.count} clean{m.count === 1 ? "" : "s"}
                    {m.avgRating != null ? ` · ★ ${m.avgRating.toFixed(1)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="two-col">
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>By property</h2>
            {byProperty.length === 0 ? (
              <p className="photo-note">No completed cleans match these filters.</p>
            ) : (
              <div className="property-card">
                <table className="feed-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Cleans</th>
                      <th>Nights</th>
                      <th>Avg rating</th>
                      <th>Avg cost/clean</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProperty.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.count}</td>
                        <td>{row.nights}</td>
                        <td>{row.avgRating != null ? `★ ${row.avgRating.toFixed(1)}` : "—"}</td>
                        <td>{row.avgCostCents != null ? formatCents(row.avgCostCents) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>By cleaner</h2>
            {byCleaner.length === 0 ? (
              <p className="photo-note">No completed cleans match these filters.</p>
            ) : (
              <div className="property-card">
                <table className="feed-table">
                  <thead>
                    <tr>
                      <th>Cleaner</th>
                      <th>Cleans</th>
                      <th>Avg rating</th>
                      <th>Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCleaner.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.count}</td>
                        <td>{row.avgRating != null ? `★ ${row.avgRating.toFixed(1)}` : "—"}</td>
                        <td>{row.avgDurationMinutes != null ? formatMinutes(row.avgDurationMinutes) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: 16, marginBottom: 12 }}>
          {filtered.length} matching job{filtered.length === 1 ? "" : "s"}
        </h2>
        {filtered.length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            No completed cleans match these filters.
          </p>
        ) : (
          <div className="property-card">
            <table className="feed-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Guest(s)</th>
                  <th>Check-in</th>
                  <th>Nights</th>
                  <th>Source</th>
                  <th>Cleaner</th>
                  <th>Rating</th>
                  <th>Dispute</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const platform = getPlatformBadge(b.platform_label);
                  return (
                    <tr key={b.id}>
                      <td>{propertyNameById[b.property_id] ?? "—"}</td>
                      <td>{b.guests || "—"}</td>
                      <td>{new Date(b.checkin_date).toLocaleDateString()}</td>
                      <td>{b.nights}</td>
                      <td>
                        {platform ? (
                          <span className="source-pill" style={{ background: platform.color }}>
                            {platform.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{(b.assigned_cleaner_id && cleanerNameById[b.assigned_cleaner_id]) || "—"}</td>
                      <td>{b.rating != null ? `★ ${b.rating}` : "—"}</td>
                      <td>
                        {b.dispute_status !== "none" ? (
                          <span className={`dispute-pill ${b.dispute_status}`}>
                            {b.dispute_status === "open" ? "Open" : "Resolved"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
