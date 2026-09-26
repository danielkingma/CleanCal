"use client";

import { MONTH_NAMES, WD, checkoutDate, isoDate, sameDay } from "@/lib/calendar-utils";
import type { Booking, Property } from "@/lib/types";
import AgendaCard from "./AgendaCard";

interface MobileAgendaProps {
  days: Date[];
  properties: Property[];
  bookings: Booking[];
  onBarClick: (booking: Booking) => void;
  viewerId?: string;
}

// A vertically-stacked day-by-day list, standing in for the property-row
// grid (Timeline.tsx) on narrow screens -- that grid's fixed per-day
// pixel widths (see DAY_W_WEEK/DAY_W_MONTH) work fine on a desktop-width
// viewport but have no reasonable way to compress onto a phone screen
// without becoming unreadable, so this is a different layout entirely
// rather than a responsive tweak of the same one.
export default function MobileAgenda({ days, properties, bookings, onBarClick, viewerId }: MobileAgendaProps) {
  const today = new Date();
  const propertyNameById = Object.fromEntries(properties.map((p) => [p.id, p.name]));

  // One card per booking, on its checkout date -- that's the day the
  // clean actually happens (see the same convention in BookingModal's
  // availability check). The desktop grid draws a bar across the whole
  // stay for occupancy context, but repeating an identical card on every
  // night of a multi-night stay here would just look like the same job
  // stuck on repeat.
  const daysWithBookings = days.map((d) => {
    const dIso = isoDate(d);
    const dayBookings = bookings
      .filter((b) => isoDate(checkoutDate(b)) === dIso)
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
              {dayBookings.map((b) => (
                <AgendaCard
                  key={b.id}
                  booking={b}
                  propertyName={propertyNameById[b.property_id] ?? "—"}
                  onClick={() => onBarClick(b)}
                  viewerId={viewerId}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
