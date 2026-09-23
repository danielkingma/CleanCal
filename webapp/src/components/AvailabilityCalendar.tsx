"use client";

import { useState } from "react";
import { markAvailable, markUnavailable } from "@/app/availability/actions";
import { MONTH_NAMES, WD, addDays, isoDate, sameDay } from "@/lib/calendar-utils";

interface AvailabilityCalendarProps {
  initialDates: string[]; // ISO dates already marked unavailable
}

export default function AvailabilityCalendar({ initialDates }: AvailabilityCalendarProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [unavailable, setUnavailable] = useState(new Set(initialDates));
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayIso = isoDate(today);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = addDays(first, -first.getDay());
  const weeksNeeded = Math.ceil((first.getDay() + daysInMonth) / 7);
  const weekStarts = Array.from({ length: weeksNeeded }, (_, w) => addDays(gridStart, w * 7));

  async function toggleDay(dateIso: string, isPast: boolean) {
    if (isPast || pending) return;
    setError(null);
    setPending(dateIso);
    const wasUnavailable = unavailable.has(dateIso);
    try {
      if (wasUnavailable) {
        await markAvailable(dateIso);
        setUnavailable((prev) => {
          const next = new Set(prev);
          next.delete(dateIso);
          return next;
        });
      } else {
        await markUnavailable(dateIso);
        setUnavailable((prev) => new Set(prev).add(dateIso));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update that date.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="property-card" style={{ maxWidth: 420 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button type="button" className="nav-btn" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          ‹
        </button>
        <h2 style={{ fontSize: 17, margin: 0 }}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button type="button" className="nav-btn" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        Click a day to mark yourself unavailable — everything else is assumed available.
      </p>

      {error ? <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div> : null}

      <div className="py-grid">
        <div className="py-weekday-row">
          {WD.map((wd) => (
            <span key={wd}>{wd[0]}</span>
          ))}
        </div>
        {weekStarts.map((weekStart) => {
          const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          return (
            <div className="py-week" key={isoDate(weekStart)}>
              <div className="py-day-row">
                {days.map((d) => {
                  const dIso = isoDate(d);
                  const otherMonth = d.getMonth() !== month;
                  const isPast = dIso < todayIso;
                  const isOff = unavailable.has(dIso);
                  return (
                    <button
                      type="button"
                      key={dIso}
                      className={`py-day-cell${otherMonth ? " other-month" : ""}${sameDay(d, today) ? " is-today" : ""}${isOff ? " unavailable" : ""}`}
                      disabled={isPast || pending === dIso}
                      onClick={() => toggleDay(dIso, isPast)}
                      title={isOff ? "Unavailable — click to clear" : "Click to mark unavailable"}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--coral)", display: "inline-block" }} />
          Unavailable
        </span>
      </div>
    </div>
  );
}
