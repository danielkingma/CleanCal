"use client";

import { STATUS_LABEL, hasAttention } from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { Booking } from "@/lib/types";

interface AgendaCardProps {
  booking: Booking;
  propertyName: string;
  onClick: () => void;
  // A cleaner now sees the whole portfolio's bookings, not just their
  // own -- passed so their own assigned cards can be picked out from
  // everyone else's on the shared schedule.
  viewerId?: string;
}

// A single clean, shown as a full-width tappable card -- used by
// MobileAgenda's day sections and by DayPickerSheet's "which of these"
// list, so both look and behave the same.
export default function AgendaCard({ booking: b, propertyName, onClick, viewerId }: AgendaCardProps) {
  const platform = getPlatformBadge(b.platform_label);
  const isOpenUnclaimed = b.is_open_job && !b.assigned_cleaner_id;
  const isMine = viewerId != null && b.assigned_cleaner_id === viewerId;
  const needsConfirmation = isMine && !b.is_open_job && !b.assignment_confirmed;

  return (
    <button
      type="button"
      className={`agenda-card ${b.status}${isOpenUnclaimed ? " open-job" : ""}${isMine ? " mine" : ""}${needsConfirmation ? " needs-confirmation" : ""}`}
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
        {needsConfirmation ? <span className="confirm-marker agenda-inline-marker">?</span> : null}
      </div>
    </button>
  );
}
