"use client";

import { MONTH_NAMES, STATUS_LABEL, WD, checkoutDate, hasAttention, isoDate, sameDay } from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { Booking, Property } from "@/lib/types";

interface MobileAgendaProps {
  days: Date[];
  properties: Property[];
  bookings: Booking[];
  onBarClick: (booking: Booking) => void;
}

// A vertically-stacked day-by-day list, standing in for the property-row
// grid (Timeline.tsx) on narrow screens -- that grid's fixed per-day
// pixel widths (see DAY_W_WEEK/DAY_W_MONTH) work fine on a desktop-width
// viewport but have no reasonable way to compress onto a phone screen
// without becoming unreadable, so this is a different layout entirely
// rather than a responsive tweak of the same one.
export default function MobileAgenda({ days, properties, bookings, onBarClick }: MobileAgendaProps) {
  const today = new Date();
  const propertyNameById = Object.fromEntries(properties.map((p) => [p.id, p.name]));

  const daysWithBookings = days.map((d) => {
    const dIso = isoDate(d);
    const dayBookings = bookings
      .filter((b) => {
        const co = isoDate(checkoutDate(b));
        return b.checkin_date <= dIso && co >= dIso;
      })
      .sort((a, b) => (propertyNameById[a.property_id] ?? "").localeCompare(propertyNameById[b.property_id] ?? ""));
    return { date: d, dIso, dayBookings };
  });

  const hasAnyBookings = daysWithBookings.some((d) => d.dayBookings.length > 0);

  return (
    <div className="agenda">
      {!hasAnyBookings ? <p className="photo-note">No cleans in this period.</p> : null}
      {daysWithBookings.map(({ date, dIso, dayBookings }) => {
        if (dayBookings.length === 0) return null;
        return (
          <div className="agenda-day" key={dIso}>
            <div className={`agenda-day-hd${sameDay(date, today) ? " is-today" : ""}`}>
              <span className="agenda-day-n">{date.getDate()}</span>
              <span className="agenda-day-wd">
                {WD[date.getDay()]} · {MONTH_NAMES[date.getMonth()].slice(0, 3)}
              </span>
            </div>
            <div className="agenda-cards">
              {dayBookings.map((b) => {
                const platform = getPlatformBadge(b.platform_label);
                const isOpenUnclaimed = b.is_open_job && !b.assigned_cleaner_id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    className={`agenda-card ${b.status}${isOpenUnclaimed ? " open-job" : ""}`}
                    onClick={() => onBarClick(b)}
                  >
                    <div className="agenda-card-top">
                      <span className="agenda-prop-name">
                        {propertyNameById[b.property_id] ?? "—"}
                      </span>
                      {platform ? (
                        <span className="source-pill" style={{ background: platform.color }}>
                          {platform.name}
                        </span>
                      ) : null}
                    </div>
                    <div className="agenda-card-bottom">
                      <span className={`agenda-status-chip ${b.status}`}>
                        {isOpenUnclaimed ? "Open job" : STATUS_LABEL[b.status]}
                      </span>
                      {b.guests ? <span className="agenda-guests">{b.guests}</span> : null}
                      {hasAttention(b) ? <span className="attn-marker agenda-inline-marker">!</span> : null}
                      {b.dispute_status === "open" ? (
                        <span className="dispute-marker agenda-inline-marker">!</span>
                      ) : null}
                    </div>
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
