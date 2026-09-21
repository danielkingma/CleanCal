"use client";

import type { Booking } from "@/lib/types";
import {
  MONTH_NAMES,
  WD,
  addDays,
  checkoutDate,
  daysBetween,
  fromISO,
  isoDate,
  sameDay,
} from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";

interface PropertyYearViewProps {
  year: number;
  bookings: Booking[]; // already scoped to the selected property
  onSelectBooking: (booking: Booking) => void;
  onSelectDate: (dateIso: string) => void;
}

interface BarSegment {
  booking: Booking;
  startCol: number; // 0-6, day of week within this row
  span: number; // nights this row covers
  roundLeft: boolean; // this segment includes the actual check-in
  roundRight: boolean; // this segment includes the actual checkout
  lane: number;
}

const NEUTRAL_BAR_COLOR = "#5B6560";

// A stay can run longer than a week, so it's drawn as one segment per row
// it crosses (like any month-grid multi-day event), clipped to that row's
// 7 days. Segments only get rounded corners on the edge that's the real
// start/end of the stay, so a bar crossing a row boundary reads as one
// continuous booking rather than several.
function weekSegments(weekStart: Date, bookings: Booking[]): BarSegment[] {
  const weekEndExclusive = addDays(weekStart, 7);

  const segments = bookings
    .map((b): BarSegment | null => {
      const checkin = fromISO(b.checkin_date);
      const checkout = checkoutDate(b);
      if (checkout <= weekStart || checkin >= weekEndExclusive) return null;
      const segStart = checkin < weekStart ? weekStart : checkin;
      const segEndExclusive = checkout > weekEndExclusive ? weekEndExclusive : checkout;
      const span = daysBetween(segStart, segEndExclusive);
      if (span <= 0) return null;
      return {
        booking: b,
        startCol: daysBetween(weekStart, segStart),
        span,
        roundLeft: sameDay(segStart, checkin),
        roundRight: daysBetween(segEndExclusive, checkout) === 0,
        lane: 0,
      };
    })
    .filter((s): s is BarSegment => s !== null)
    .sort((a, b) => a.startCol - b.startCol || a.span - b.span);

  // Lanes only matter if two bookings on the same property overlap, which
  // shouldn't normally happen -- but a bad iCal double-sync or manual entry
  // error could still produce it, so stack rather than hide the overlap.
  const laneEnds: number[] = [];
  for (const seg of segments) {
    let lane = laneEnds.findIndex((end) => end <= seg.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    seg.lane = lane;
    laneEnds[lane] = seg.startCol + seg.span;
  }

  return segments;
}

export default function PropertyYearView({
  year,
  bookings,
  onSelectBooking,
  onSelectDate,
}: PropertyYearViewProps) {
  const today = new Date();

  return (
    <div className="py-year-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const gridStart = addDays(first, -first.getDay());
        const weeksNeeded = Math.ceil((first.getDay() + daysInMonth) / 7);
        const weekStarts = Array.from({ length: weeksNeeded }, (_, w) => addDays(gridStart, w * 7));

        return (
          <div className="py-month" key={m}>
            <div className="py-month-title">{MONTH_NAMES[m]}</div>
            <div className="py-weekday-row">
              {WD.map((wd) => (
                <span key={wd}>{wd[0]}</span>
              ))}
            </div>
            {weekStarts.map((weekStart) => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
              const segments = weekSegments(weekStart, bookings);

              return (
                <div className="py-week" key={isoDate(weekStart)}>
                  <div className="py-day-row">
                    {days.map((d) => {
                      const otherMonth = d.getMonth() !== m;
                      return (
                        <button
                          type="button"
                          key={isoDate(d)}
                          className={`py-day-cell${otherMonth ? " other-month" : ""}${sameDay(d, today) ? " is-today" : ""}`}
                          onClick={() => onSelectDate(isoDate(d))}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                  {segments.length > 0 ? (
                    <div className="py-bar-stack">
                      {segments.map((seg) => {
                        const platform = getPlatformBadge(seg.booking.platform_label);
                        const isOpenUnclaimed = seg.booking.is_open_job && !seg.booking.assigned_cleaner_id;
                        const label = isOpenUnclaimed ? "Open" : seg.booking.guests || "Reserved";
                        return (
                          <button
                            type="button"
                            key={seg.booking.id}
                            className={`py-bar${seg.roundLeft ? " round-left" : ""}${seg.roundRight ? " round-right" : ""}${isOpenUnclaimed ? " open-job" : ""}`}
                            style={{
                              gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                              gridRow: seg.lane + 1,
                              background: platform?.color ?? NEUTRAL_BAR_COLOR,
                            }}
                            title={`${seg.booking.guests || "Reserved"} — ${seg.booking.checkin_date}, ${seg.booking.nights}n`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBooking(seg.booking);
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
