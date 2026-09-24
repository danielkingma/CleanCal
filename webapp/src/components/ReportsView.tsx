"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { Booking, Profile, Property } from "@/lib/types";

interface ReportsViewProps {
  completed: Booking[];
  properties: Property[];
  profiles: Profile[];
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportsView({ completed, properties, profiles }: ReportsViewProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");

  const propertyNameById = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.name])),
    [properties],
  );
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
    const map = new Map<string, { count: number; nights: number; ratingSum: number; ratingCount: number }>();
    for (const b of filtered) {
      const entry = map.get(b.property_id) ?? { count: 0, nights: 0, ratingSum: 0, ratingCount: 0 };
      entry.count += 1;
      entry.nights += b.nights;
      if (b.rating != null) {
        entry.ratingSum += b.rating;
        entry.ratingCount += 1;
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
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, propertyNameById]);

  const byCleaner = useMemo(() => {
    const map = new Map<string, { count: number; ratingSum: number; ratingCount: number }>();
    for (const b of filtered) {
      if (!b.assigned_cleaner_id) continue;
      const entry = map.get(b.assigned_cleaner_id) ?? { count: 0, ratingSum: 0, ratingCount: 0 };
      entry.count += 1;
      if (b.rating != null) {
        entry.ratingSum += b.rating;
        entry.ratingCount += 1;
      }
      map.set(b.assigned_cleaner_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: cleanerNameById[id] ?? "—",
        count: v.count,
        avgRating: v.ratingCount ? v.ratingSum / v.ratingCount : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, cleanerNameById]);

  function handleExportCsv() {
    const header = ["Property", "Guest(s)", "Check-in", "Nights", "Source", "Cleaner", "Rating", "Rating comment", "Dispute"];
    const rows = filtered.map((b) => [
      propertyNameById[b.property_id] ?? "",
      b.guests || "",
      b.checkin_date,
      b.nights,
      b.platform_label || "",
      (b.assigned_cleaner_id && cleanerNameById[b.assigned_cleaner_id]) || "",
      b.rating ?? "",
      b.rating_comment || "",
      b.dispute_status !== "none" ? b.dispute_status : "",
    ]);
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
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "rgba(246, 243, 236, 0.8)", fontSize: 14 }}>Reports</div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
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
                    </tr>
                  </thead>
                  <tbody>
                    {byProperty.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.count}</td>
                        <td>{row.nights}</td>
                        <td>{row.avgRating != null ? `★ ${row.avgRating.toFixed(1)}` : "—"}</td>
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
                    </tr>
                  </thead>
                  <tbody>
                    {byCleaner.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.count}</td>
                        <td>{row.avgRating != null ? `★ ${row.avgRating.toFixed(1)}` : "—"}</td>
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
