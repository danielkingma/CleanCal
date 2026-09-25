"use client";

import type { Booking } from "@/lib/types";
import {
  CHECKIN_FRAC,
  CHECKOUT_FRAC,
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

interface MonthGridProps {
  year: number;
  month: number; // 0-11
  bookings: Booking[]; // already scoped to whichever property(ies) the caller wants shown
  onSelectBooking: (booking: Booking) => void;
  onSelectDate: (dateIso: string) => void;
  showTitle?: boolean;
  // The Year view has room for a platform name (Airbnb, Vrbo, ...) on a
  // long-enough bar; the mobile Month tab's bars are already tighter on
  // their own and don't get it. Off by default so the standalone mobile
  // usage doesn't have to opt out.
  showPlatformNames?: boolean;
}

interface BarSegment {
  booking: Booking;
  startCol: number; // 0-6, day of week within this row
  span: number; // day-columns this row covers, including a checkout day sliver
  roundLeft: boolean; // this segment includes the actual check-in
  roundRight: boolean; // this segment includes the actual checkout
  marginLeftPct: number; // inset the visible bar to the 2pm check-in mark
  marginRightPct: number; // inset the visible bar to the 10am checkout mark
  lane: number;
}

const NEUTRAL_BAR_COLOR = "#5B6560";

// A stay can run longer than a week, so it's drawn as one segment per row
// it crosses (like any month-grid multi-day event), clipped to that row's
// 7 days. Segments only get rounded corners -- and the 2pm/10am inset
// below -- on the edge that's the real start/end of the stay, so a bar
// crossing a row boundary reads as one continuous booking rather than
// several, matching the Month/Week timeline's check-in/checkout overlap.
function weekSegments(weekStart: Date, bookings: Booking[]): BarSegment[] {
  const weekEndInclusive = addDays(weekStart, 6);

  const segments = bookings
    .map((b): BarSegment | null => {
      const checkin = fromISO(b.checkin_date);
      const checkout = checkoutDate(b); // exclusive: the day after the last night
      // The checkout day itself gets a column too -- the bar only fills a
      // sliver of it (up to CHECKOUT_FRAC), same as the Month/Week bars.
      if (checkout < weekStart || checkin > weekEndInclusive) return null;
      const segStart = checkin < weekStart ? weekStart : checkin;
      const segEndInclusive = checkout > weekEndInclusive ? weekEndInclusive : checkout;
      const startCol = daysBetween(weekStart, segStart);
      const span = daysBetween(segStart, segEndInclusive) + 1;
      if (span <= 0) return null;
      const roundLeft = sameDay(segStart, checkin);
      const roundRight = sameDay(segEndInclusive, checkout);
      return {
        booking: b,
        startCol,
        span,
        roundLeft,
        roundRight,
        marginLeftPct: roundLeft ? (CHECKIN_FRAC / span) * 100 : 0,
        marginRightPct: roundRight ? ((1 - CHECKOUT_FRAC) / span) * 100 : 0,
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

// Renders one month's grid (weekday header + week rows + booking bars).
// Used both as one of the 12 panels in PropertyYearView, and standalone as
// the mobile "Month" tab (see MobileMonthView / CalendarApp.tsx) -- same
// visual language, just one panel at a time instead of twelve tiny ones.
export default function MonthGrid({
  year,
  month,
  bookings,
  onSelectBooking,
  onSelectDate,
  showTitle = true,
  showPlatformNames = false,
}: MonthGridProps) {
  const today = new Date();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = addDays(first, -first.getDay());
  const weeksNeeded = Math.ceil((first.getDay() + daysInMonth) / 7);
  const weekStarts = Array.from({ length: weeksNeeded }, (_, w) => addDays(gridStart, w * 7));

  return (
    <div className="py-month">
      {showTitle ? <div className="py-month-title">{MONTH_NAMES[month]}</div> : null}
      <div className="py-grid">
        <div className="py-weekday-row">
          {WD.map((wd) => (
            <span key={wd}>{wd[0]}</span>
          ))}
        </div>
        {weekStarts.map((weekStart, weekIdx) => {
          const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          const segments = weekSegments(weekStart, bookings);

          return (
            <div
              className={`py-week${weekIdx === weekStarts.length - 1 ? " last" : ""}`}
              key={isoDate(weekStart)}
            >
              <div className="py-day-row">
                {days.map((d) => {
                  const otherMonth = d.getMonth() !== month;
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
              <div className="py-bar-stack">
                {segments.map((seg) => {
                  const platform = getPlatformBadge(seg.booking.platform_label);
                  const isOpenUnclaimed = seg.booking.is_open_job && !seg.booking.assigned_cleaner_id;
                  const isStale = Boolean(seg.booking.ical_missing_since);
                  const label = isOpenUnclaimed ? "Open" : seg.booking.guests || "Reserved";
                  // seg.span always includes a checkout-day sliver column,
                  // so a 1-night stay already measures span 2 -- checking
                  // the booking's actual night count (not the grid span)
                  // is what "long enough to fit the word" really means.
                  // seg.roundRight restricts this to the row that actually
                  // contains the checkout: a stay spanning multiple weeks
                  // gets one BarSegment per row it crosses, and without this
                  // check the platform name was repeated on every one of
                  // those rows instead of once at the real end of the stay.
                  const showPlatformName =
                    showPlatformNames && Boolean(platform) && seg.booking.nights >= 2 && seg.roundRight;
                  return (
                    <button
                      type="button"
                      key={seg.booking.id}
                      className={`py-bar${seg.roundLeft ? " round-left" : ""}${seg.roundRight ? " round-right" : ""}${isOpenUnclaimed ? " open-job" : ""}${isStale ? " ical-stale" : ""}`}
                      style={{
                        gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                        gridRow: seg.lane + 1,
                        marginLeft: `${seg.marginLeftPct}%`,
                        marginRight: `${seg.marginRightPct}%`,
                        background: platform?.color ?? NEUTRAL_BAR_COLOR,
                      }}
                      title={
                        isStale
                          ? "No longer in source calendar — may be cancelled"
                          : `${seg.booking.guests || "Reserved"} — ${seg.booking.checkin_date}, ${seg.booking.nights}n`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(seg.booking);
                      }}
                    >
                      <span className="py-bar-label">{label}</span>
                      {/* Only when the segment has at least two day-columns
                          to work with -- on a single day there's no room
                          for a second word without either one getting
                          clipped. */}
                      {showPlatformName ? <span className="py-bar-platform">{platform!.name}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
