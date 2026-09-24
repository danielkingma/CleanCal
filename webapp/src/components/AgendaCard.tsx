"use client";

import { STATUS_LABEL, hasAttention } from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { Booking } from "@/lib/types";

interface AgendaCardProps {
  booking: Booking;
  propertyName: string;
  onClick: () => void;
}

// A single clean, shown as a full-width tappable card -- used by
// MobileAgenda's day sections and by DayPickerSheet's "which of these"
// list, so both look and behave the same.
export default function AgendaCard({ booking: b, propertyName, onClick }: AgendaCardProps) {
  const platform = getPlatformBadge(b.platform_label);
  const isOpenUnclaimed = b.is_open_job && !b.assigned_cleaner_id;

  return (
    <button
      type="button"
      className={`agenda-card ${b.status}${isOpenUnclaimed ? " open-job" : ""}`}
      onClick={onClick}
    >
      <div className="agenda-card-top">
        <span className="agenda-prop-name">{propertyName}</span>
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
        {b.dispute_status === "open" ? <span className="dispute-marker agenda-inline-marker">!</span> : null}
      </div>
    </button>
  );
}
