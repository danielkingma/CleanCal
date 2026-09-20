"use client";

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
}: TimelineProps) {
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
      <div className="cal-inner" style={{ width: totalW }}>
        <div className="cal-header" style={{ width: totalW }}>
          <div className="corner" style={{ width: LABEL_W, height: headerH }}>
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
              <div className="prop-label" style={{ width: LABEL_W }} title={prop.name}>
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
                  const cls = ["booking-bar", b.status];
                  if (isStart) cls.push("start");
                  if (isEnd) cls.push("end");
                  if (b.ical_missing_since) cls.push("ical-stale");
                  const label = weekly
                    ? `${STATUS_LABEL[b.status]} · ${b.nights}n`
                    : isStart
                      ? STATUS_LABEL[b.status]
                      : "";
                  const platform = getPlatformBadge(b.platform_label);

                  return (
                    <div
                      key={b.id}
                      className={cls.join(" ")}
                      style={{
                        left,
                        width,
                        top: weekly ? 8 : 6,
                        height: rowH - (weekly ? 16 : 12),
                      }}
                      title={b.ical_missing_since ? "No longer in source calendar — may be cancelled" : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBarClick(b);
                      }}
                    >
                      {platform ? (
                        <>
                          <span className="platform-stripe" style={{ background: platform.color }} />
                          <span
                            className="platform-badge"
                            style={{ background: platform.color }}
                            title={platform.name}
                          >
                            {platform.code}
                          </span>
                        </>
                      ) : null}
                      {hasAttention(b) ? (
                        <span className="attn-marker" title="Requires attention">
                          !
                        </span>
                      ) : null}
                      {label}
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
