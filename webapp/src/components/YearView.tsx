"use client";

import type { Booking } from "@/lib/types";
import { MONTH_NAMES, addDays, checkoutDate, isoDate, sameDay } from "@/lib/calendar-utils";

interface YearViewProps {
  year: number;
  bookings: Booking[];
  onSelectMonth: (month: number) => void;
  onSelectDate: (dateIso: string) => void;
}

function tasksOn(bookings: Booking[], d: Date): Booking[] {
  const ds = isoDate(d);
  return bookings.filter((b) => {
    const co = isoDate(checkoutDate(b));
    return ds >= b.checkin_date && ds <= co;
  });
}

const DOT_VAR: Record<Booking["status"], string> = {
  "to-clean": "--amber",
  "in-progress": "--blue",
  complete: "--teal-deep",
};

export default function YearView({ year, bookings, onSelectMonth, onSelectDate }: YearViewProps) {
  const today = new Date();

  return (
    <div className="year-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const gridStart = addDays(first, -first.getDay());
        const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

        return (
          <div className="mini-month" key={m}>
            <button type="button" className="mini-month-title" onClick={() => onSelectMonth(m)}>
              {MONTH_NAMES[m]}
            </button>
            <div className="mini-grid">
              {cells.map((d) => {
                const otherMonth = d.getMonth() !== m;
                const isToday = sameDay(d, today);
                const dTasks = otherMonth ? [] : tasksOn(bookings, d);
                return (
                  <button
                    type="button"
                    key={isoDate(d)}
                    className={`mini-cell${otherMonth ? " other-month" : ""}${isToday ? " is-today" : ""}`}
                    onClick={() => onSelectDate(isoDate(d))}
                  >
                    {d.getDate()}
                    {dTasks.length ? (
                      <div className="mini-dots">
                        {dTasks.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="mini-dot"
                            style={{ background: `var(${DOT_VAR[t.status]})` }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
