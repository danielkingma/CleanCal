"use client";

import { Fragment, useState } from "react";
import { claimUnassignedBooking } from "@/app/calendar/actions";
import type { Booking, Property } from "@/lib/types";
import {
  CHECKIN_FRAC,
  CHECKOUT_FRAC,
  HEADER_H,
  LABEL_W,
  ROW_H,
  STATUS_LABEL,
  WD,
  checkoutDate,
  daysBetween,
  fromISO,
  hasAttention,
  isoDate,
  isClaimableBooking,
  sameDay,
} from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";

interface TimelineProps {
  days: Date[];
  dayW: number;
  weekly: boolean;
  properties: Property[];
  bookings: Booking[];
  onBarClick: (booking: Booking) => void;
  onTrackClick: (propertyId: string, dateIso: string) => void;
  canCreate: boolean;
  // A cleaner now sees the whole portfolio's bookings, not just their
  // own -- passed so their own assigned bars can be picked out from
  // everyone else's on the shared schedule.
  viewerId?: string;
  // Staff always sees the full assignment picture, so the "unassigned --
  // check the box to claim it" treatment below never applies to them.
  isStaffViewer?: boolean;
  // Staff view only -- resolves booking.assigned_cleaner_id to a name,
  // shown next to the broom mark below.
  cleanerNameById?: Record<string, string>;
  // Staff view only -- resolves booking.assigned_cleaner_id to the
  // cleaner's preferred initial, shown in place of their name on the bar.
  cleanerInitialById?: Record<string, string>;
  // Tints that initial in the cleaner's own favourite colour.
  cleanerColorById?: Record<string, string>;
}

export default function Timeline({
  days,
  dayW,
  weekly,
  properties,
  bookings,
  onBarClick,
  onTrackClick,
  canCreate,
  viewerId,
  isStaffViewer = false,
  cleanerNameById,
  cleanerInitialById,
  cleanerColorById,
}: TimelineProps) {
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

  if (days.length === 0) return null;

  const rangeStart = days[0];
  const rangeStartISO = isoDate(rangeStart);
  const rangeEndISO = isoDate(days[days.length - 1]);
  const today = new Date();
  const totalW = LABEL_W + days.length * dayW;
  const rowH = weekly ? ROW_H + 12 : ROW_H;
  const headerH = weekly ? HEADER_H + 16 : HEADER_H;
  const todayIdx = daysBetween(rangeStart, today);

  return (
    <div className={`cal-outer${weekly ? " weekly" : ""}`}>
      <div className="cal-inner" style={weekly ? { minWidth: totalW } : { width: totalW }}>
        <div className="cal-header" style={weekly ? { minWidth: totalW } : { width: totalW }}>
          <div
            className="corner"
            style={weekly ? { minWidth: LABEL_W, height: headerH } : { width: LABEL_W, height: headerH }}
          >
            Property
          </div>
          {days.map((d) => (
            <div
              key={isoDate(d)}
              className={`day-hd${sameDay(d, today) ? " is-today" : ""}`}
              style={{ width: dayW, height: headerH }}
            >
              <span className="wd">{WD[d.getDay()]}</span>
              <span className="n">{d.getDate()}</span>
            </div>
          ))}
        </div>

        {properties.map((prop) => {
          const propBookings = bookings.filter((b) => {
            if (b.property_id !== prop.id) return false;
            const co = isoDate(checkoutDate(b));
            return b.checkin_date <= rangeEndISO && co >= rangeStartISO;
          });

          return (
            <div className="prop-row" key={prop.id} style={{ height: rowH }}>
              <div
                className="prop-label"
                style={weekly ? { minWidth: LABEL_W } : { width: LABEL_W }}
                title={prop.name}
              >
                {prop.name}
              </div>
              <div
                className="prop-track"
                style={{
                  width: days.length * dayW,
                  height: rowH,
                  backgroundImage:
                    "linear-gradient(to right, var(--line) 1px, transparent 1px)",
                  backgroundSize: `${dayW}px 100%`,
                  backgroundRepeat: "repeat-x",
                  cursor: canCreate ? "pointer" : "default",
                }}
                onClick={(e) => {
                  if (!canCreate || e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const dayIdx = Math.min(
                    days.length - 1,
                    Math.max(0, Math.floor((e.clientX - rect.left) / dayW)),
                  );
                  onTrackClick(prop.id, isoDate(days[dayIdx]));
                }}
              >
                {todayIdx >= 0 && todayIdx < days.length ? (
                  <div className="today-strip" style={{ left: todayIdx * dayW, width: dayW }} />
                ) : null}
                {propBookings.map((b) => {
                  const co = checkoutDate(b);
                  let startIdx = daysBetween(rangeStart, fromISO(b.checkin_date));
                  let endIdx = daysBetween(rangeStart, co);
                  const isStart = startIdx >= 0;
                  const isEnd = endIdx <= days.length - 1;
                  startIdx = Math.max(0, startIdx);
                  endIdx = Math.min(days.length - 1, endIdx);
                  const startUnit = isStart ? startIdx + CHECKIN_FRAC : startIdx;
                  const endUnit = isEnd ? endIdx + CHECKOUT_FRAC : endIdx + 1;
                  const left = startUnit * dayW;
                  const width = (endUnit - startUnit) * dayW;
                  const isOpenUnclaimed = b.is_open_job && !b.assigned_cleaner_id;
                  const isMine = viewerId != null && b.assigned_cleaner_id === viewerId;
                  const isClaimable = isClaimableBooking(b, viewerId, isStaffViewer);
                  const isPending = pendingIds.has(b.id);
                  const cls = ["booking-bar", b.status];
                  if (isStart) cls.push("start");
                  if (isEnd) cls.push("end");
                  if (isOpenUnclaimed) cls.push("open-job");
                  if (isMine) cls.push("mine");
                  if (isMine && !b.is_open_job && !b.assignment_confirmed) cls.push("needs-confirmation");
                  if (isClaimable) cls.push("requestable");
                  // A staff viewer otherwise has no way to tell, at a
                  // glance, whether a cleaner is actually on a job -- the
                  // bar looks the same either way. A cleaner viewer gets
                  // the same broom + initial too, but only for their own
                  // job -- someone else's assigned bar stays unmarked to
                  // them, same as everywhere else on the shared schedule.
                  const isAssignedToCleaner = (isStaffViewer || isMine) && !isOpenUnclaimed && !!b.assigned_cleaner_id;
                  const assignedCleanerName = isAssignedToCleaner
                    ? (cleanerNameById?.[b.assigned_cleaner_id!] ?? "Cleaner")
                    : null;
                  // Always the initial, never the full name -- the bar's
                  // color already says the status, so once a cleaner's on
                  // it the initial plus the night count is the useful part,
                  // and dropping "To Clean"/"In Progress" is what makes
                  // room for both on a short stay's narrow bar.
                  const assignedCleanerInitial = isAssignedToCleaner
                    ? (cleanerInitialById?.[b.assigned_cleaner_id!] || assignedCleanerName?.charAt(0).toUpperCase() || "?")
                    : null;
                  // Tints just the initial, not the whole bar label -- the
                  // rest of the text (night count) stays the bar's normal
                  // white so the colour reads as "whose job" rather than
                  // just recoloring the bar.
                  const assignedCleanerColor =
                    isAssignedToCleaner && b.assigned_cleaner_id ? cleanerColorById?.[b.assigned_cleaner_id] : undefined;
                  // A non-weekly bar only ever labels its start segment --
                  // later segments of a multi-day bar stay blank.
                  const showBroomLabel = Boolean(assignedCleanerInitial) && (weekly || isStart);
                  const label = isOpenUnclaimed
                    ? weekly
                      ? "Open — tap to claim"
                      : isStart
                        ? "Open"
                        : ""
                    : showBroomLabel
                      ? "" // rendered as coloured JSX below instead of plain text
                      : weekly
                        ? `${STATUS_LABEL[b.status]} · ${b.nights}n`
                        : isStart
                          ? STATUS_LABEL[b.status]
                          : "";
                  // Nothing about who's on it, or where it came from, shows
                  // on a bar the viewer can only request -- it isn't theirs
                  // to see yet, only to claim for themselves.
                  const platform = isClaimable ? undefined : getPlatformBadge(b.platform_label);
                  const barTop = weekly ? 8 : 6;
                  const barHeight = rowH - (weekly ? 16 : 12);

                  return (
                    <Fragment key={b.id}>
                      <div
                        className={cls.join(" ")}
                        style={{
                          left,
                          width,
                          top: barTop,
                          height: barHeight,
                        }}
                        title={
                          isOpenUnclaimed
                            ? "Open job — click to claim"
                            : isClaimable
                              ? "Unassigned — check the box to claim this job"
                              : undefined
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onBarClick(b);
                        }}
                      >
                        {platform ? (
                          <span className="platform-stripe" style={{ background: platform.color }} />
                        ) : null}
                        {isClaimable ? (
                          <label
                            className="bar-request-check"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              disabled={isPending}
                              onChange={() => handleClaim(b)}
                            />
                            {isStart || weekly ? "Assign" : ""}
                          </label>
                        ) : showBroomLabel ? (
                          <>
                            🧹{" "}
                            <span style={assignedCleanerColor ? { color: assignedCleanerColor } : undefined}>
                              {assignedCleanerInitial}
                            </span>
                            {weekly ? ` · ${b.nights}n` : null}
                          </>
                        ) : (
                          label
                        )}
                      </div>
                      {/* Rendered as siblings of the bar, not children -- the bar's
                          overflow:hidden (needed to truncate long labels) would
                          otherwise clip these corner badges, which are deliberately
                          positioned half outside the bar's own box. */}
                      {platform ? (
                        <span
                          className="platform-badge"
                          style={{ left: left - 5, top: barTop - 5, background: platform.color }}
                          title={platform.name}
                        >
                          {platform.code}
                        </span>
                      ) : null}
                      {hasAttention(b) ? (
                        <span
                          className="attn-marker"
                          style={{ left: left + width - 12, top: barTop - 5 }}
                          title="Requires attention"
                        >
                          !
                        </span>
                      ) : null}
                      {b.dispute_status === "open" ? (
                        <span
                          className="dispute-marker"
                          style={{ left: left + width - 12, top: barTop + barHeight - 12 }}
                          title="Open dispute"
                        >
                          !
                        </span>
                      ) : null}
                      {isMine && !b.is_open_job && !b.assignment_confirmed ? (
                        <span
                          className="confirm-marker"
                          style={{ left: left - 5, top: barTop + barHeight - 12 }}
                          title="Needs your confirmation"
                        >
                          ?
                        </span>
                      ) : null}
                    </Fragment>
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
