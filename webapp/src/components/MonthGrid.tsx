"use client";

import { useState } from "react";
import { claimUnassignedBooking } from "@/app/calendar/actions";
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
  isClaimableBooking,
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
  // A cleaner now sees the whole portfolio's bookings, not just their
  // own -- passed so their own assigned segments can be picked out from
  // everyone else's on the shared schedule.
  viewerId?: string;
  // Staff always sees the full assignment picture, so the "unassigned --
  // check the box to claim it" treatment below never applies to them.
  isStaffViewer?: boolean;
  // Staff view only -- resolves booking.assigned_cleaner_id to a name,
  // shown next to the broom mark below.
  cleanerNameById?: Record<string, string>;
  // Staff view only -- resolves booking.assigned_cleaner_id to the
  // cleaner's preferred initial, shown in place of their name on a
  // single-day segment (barely wide enough for a couple of characters).
  cleanerInitialById?: Record<string, string>;
  // Tints that name/initial in the cleaner's own favourite colour.
  cleanerColorById?: Record<string, string>;
  // Off only for the Year view's 12 tiny month panels (see
  // PropertyYearView) -- there's no room there to usefully show who's on
  // a job, so those bars fall back to showing the booking platform
  // instead, same as an unassigned bar.
  showCleanerLabel?: boolean;
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
function weekSegments(weekStart: Date, bookings: Booking[], monthStart: Date, monthEnd: Date): BarSegment[] {
  const weekEndInclusive = addDays(weekStart, 6);

  const segments = bookings
    .map((b): BarSegment | null => {
      const checkin = fromISO(b.checkin_date);
      const checkout = checkoutDate(b); // exclusive: the day after the last night
      // The checkout day itself gets a column too -- the bar only fills a
      // sliver of it (up to CHECKOUT_FRAC), same as the Month/Week bars.
      if (checkout < weekStart || checkin > weekEndInclusive) return null;
      let segStart = checkin < weekStart ? weekStart : checkin;
      let segEndInclusive = checkout > weekEndInclusive ? weekEndInclusive : checkout;
      // A stay that spills into the faded lead-in/trail-off days from the
      // adjoining month is real, but those days belong to that other
      // month's own panel -- drawing a bar across them here just repeats
      // it a second time right next to the actual one. Clip the segment to
      // this month's own days; if nothing's left, there's nothing to draw.
      if (segStart < monthStart) segStart = monthStart;
      if (segEndInclusive > monthEnd) segEndInclusive = monthEnd;
      if (segStart > segEndInclusive) return null;
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
  // A segment's span includes a column for its checkout-day sliver, so a
  // normal same-day handoff -- one stay checking out the same day the next
  // checks in -- has its last column equal to the next segment's first
  // column. That's not a real overlap (the bars don't touch: the first
  // ends at the 10am checkout mark, the second starts at 2pm), so it
  // shouldn't claim a second lane and puff up the day cell's height. Only
  // a *span* of columns actually in common -- two or more shared days --
  // counts as an overlap worth stacking.
  const laneEnds: number[] = [];
  for (const seg of segments) {
    let lane = laneEnds.findIndex((end) => end <= seg.startCol + 1);
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
  viewerId,
  isStaffViewer = false,
  cleanerNameById,
  cleanerInitialById,
  cleanerColorById,
  showCleanerLabel = true,
}: MonthGridProps) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  async function handleClaim(b: Booking) {
    setPendingIds((prev) => new Set(prev).add(b.id));
    try {
      await claimUnassignedBooking(b.id);
    } catch {
      // Best-effort from an inline calendar checkbox -- opening the
      // booking's modal (which surfaces a real error banner) is the
      // fallback if a claim needs troubleshooting.
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(b.id);
        return next;
      });
    }
  }

  const today = new Date();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
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
          const segments = weekSegments(weekStart, bookings, first, last);

          return (
            <div
              className={`py-week${weekIdx === weekStarts.length - 1 ? " last" : ""}`}
              key={isoDate(weekStart)}
            >
              <div className="py-day-row">
                {days.map((d) => {
                  const otherMonth = d.getMonth() !== month;
                  // A leading/trailing padding day is the same calendar
                  // date as a cell in the adjacent month's own panel (e.g.
                  // Sept 27 also fills October's first row) -- only the
                  // panel that actually owns the month highlights it as
                  // today, so it doesn't look duplicated across panels.
                  const isToday = !otherMonth && sameDay(d, today);
                  return (
                    <button
                      type="button"
                      key={isoDate(d)}
                      className={`py-day-cell${otherMonth ? " other-month" : ""}${isToday ? " is-today" : ""}`}
                      onClick={() => onSelectDate(isoDate(d))}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="py-bar-stack">
                {segments.map((seg) => {
                  const isOpenUnclaimed = seg.booking.is_open_job && !seg.booking.assigned_cleaner_id;
                  const isMine = viewerId != null && seg.booking.assigned_cleaner_id === viewerId;
                  const needsConfirmation = isMine && !seg.booking.is_open_job && !seg.booking.assignment_confirmed;
                  // The Year view's 12 tiny panels drop the cleaner's
                  // name/colour entirely (showCleanerLabel below) since
                  // there's no room for it -- this outline is what's left
                  // to show, at a glance and for every viewer (not just
                  // the viewer's own job, which already gets the teal
                  // "mine" treatment below), which bookings already have
                  // someone on them.
                  const hasAnyCleaner = !isOpenUnclaimed && !!seg.booking.assigned_cleaner_id;
                  const showHasCleanerOutline = !showCleanerLabel && hasAnyCleaner && !isMine;
                  const isClaimable = isClaimableBooking(seg.booking, viewerId, isStaffViewer);
                  const isPending = pendingIds.has(seg.booking.id);
                  // Nothing about who's on it, or where it came from, shows
                  // on a segment the viewer can only claim -- it isn't
                  // theirs to see yet, only to take for themselves.
                  const platform = isClaimable ? undefined : getPlatformBadge(seg.booking.platform_label);
                  const isAssignedToCleaner =
                    isStaffViewer && showCleanerLabel && !isOpenUnclaimed && !!seg.booking.assigned_cleaner_id;
                  const assignedCleanerName = isAssignedToCleaner
                    ? (cleanerNameById?.[seg.booking.assigned_cleaner_id!] ?? "Cleaner")
                    : null;
                  // A single-day segment is barely wide enough for a
                  // couple of characters, so it shows the cleaner's
                  // initial instead of a name that would just get
                  // ellipsis-truncated down to one letter anyway.
                  const assignedCleanerInitial = isAssignedToCleaner
                    ? (cleanerInitialById?.[seg.booking.assigned_cleaner_id!] ||
                      assignedCleanerName?.charAt(0).toUpperCase() ||
                      "?")
                    : null;
                  const showCleanerInitial = isAssignedToCleaner && seg.span <= 1;
                  const displayCleanerName = showCleanerInitial ? assignedCleanerInitial : assignedCleanerName;
                  const assignedCleanerColor = isAssignedToCleaner
                    ? cleanerColorById?.[seg.booking.assigned_cleaner_id!]
                    : undefined;
                  // Which cleaner is on it is the most useful thing to show
                  // an Owner/Manager at a glance, so it wins over the guest
                  // name once assigned. The platform's color is already the
                  // segment's background -- its name is only spelled out in
                  // text as a last-resort fallback, never alongside it, so
                  // it never shows twice on the same booking.
                  const label = isOpenUnclaimed
                    ? "Open"
                    : (displayCleanerName ?? (seg.booking.guests || platform?.name || ""));
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={seg.booking.id}
                      className={`py-bar${seg.roundLeft ? " round-left" : ""}${seg.roundRight ? " round-right" : ""}${isOpenUnclaimed ? " open-job" : ""}${isMine ? " mine" : ""}${showHasCleanerOutline ? " has-cleaner" : ""}${needsConfirmation ? " needs-confirmation" : ""}${isClaimable ? " requestable" : ""}`}
                      style={{
                        gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                        gridRow: seg.lane + 1,
                        marginLeft: `${seg.marginLeftPct}%`,
                        marginRight: `${seg.marginRightPct}%`,
                        background: platform?.color ?? NEUTRAL_BAR_COLOR,
                      }}
                      title={
                        isClaimable
                          ? "Unassigned — check the box to claim this job"
                          : `${assignedCleanerName ?? (seg.booking.guests || platform?.name || "Booking")} — ${seg.booking.checkin_date}, ${seg.booking.nights}n`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(seg.booking);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectBooking(seg.booking);
                        }
                      }}
                    >
                      {isClaimable && seg.roundLeft ? (
                        <label className="bar-request-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={false}
                            disabled={isPending}
                            onChange={() => handleClaim(seg.booking)}
                          />
                          Assign
                        </label>
                      ) : null}
                      {isClaimable ? null : (
                        <span className="py-bar-label">
                          {assignedCleanerName ? "🧹 " : ""}
                          {needsConfirmation ? "? " : ""}
                          {assignedCleanerName ? (
                            <span style={assignedCleanerColor ? { color: assignedCleanerColor } : undefined}>
                              {displayCleanerName}
                            </span>
                          ) : (
                            label
                          )}
                        </span>
                      )}
                    </div>
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
