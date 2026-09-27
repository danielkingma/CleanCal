"use client";

import { useState } from "react";
import { requestBooking, withdrawBookingRequest } from "@/app/calendar/actions";
import { STATUS_LABEL, hasAttention, isRequestableBooking } from "@/lib/calendar-utils";
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
  // Staff always sees the full assignment picture, so the "unassigned --
  // check the box to request it" treatment below never applies to them.
  isStaffViewer?: boolean;
}

// A single clean, shown as a full-width tappable card -- used by
// MobileAgenda's day sections and by DayPickerSheet's "which of these"
// list, so both look and behave the same.
export default function AgendaCard({ booking: b, propertyName, onClick, viewerId, isStaffViewer }: AgendaCardProps) {
  const [pending, setPending] = useState(false);
  const isOpenUnclaimed = b.is_open_job && !b.assigned_cleaner_id;
  const isMine = viewerId != null && b.assigned_cleaner_id === viewerId;
  const needsConfirmation = isMine && !b.is_open_job && !b.assignment_confirmed;
  const isRequestable = isRequestableBooking(b, viewerId, Boolean(isStaffViewer));
  const hasRequested = isRequestable && b.requested_cleaner_id === viewerId;
  // Nothing about who's on it, or where it came from, shows on a card the
  // viewer can only request -- it isn't theirs to see yet, only to ask an
  // Owner/Manager for.
  const platform = isRequestable ? undefined : getPlatformBadge(b.platform_label);

  async function handleToggleRequest() {
    setPending(true);
    try {
      if (hasRequested) {
        await withdrawBookingRequest(b.id);
      } else {
        await requestBooking(b.id);
      }
    } catch {
      // Best-effort from an inline calendar checkbox -- opening the
      // booking's modal (which surfaces a real error banner) is the
      // fallback if a request needs troubleshooting.
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`agenda-card ${b.status}${isOpenUnclaimed ? " open-job" : ""}${isMine ? " mine" : ""}${needsConfirmation ? " needs-confirmation" : ""}${isRequestable ? " requestable" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="agenda-card-top">
        <span className="agenda-prop-name">{propertyName}</span>
        {platform ? (
          <span className="source-pill" style={{ background: platform.color }}>
            {platform.name}
          </span>
        ) : null}
      </div>
      {isRequestable ? (
        <div className="agenda-card-bottom">
          <label className="bar-request-check" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={hasRequested} disabled={pending} onChange={handleToggleRequest} />
            Assign
          </label>
        </div>
      ) : (
        <div className="agenda-card-bottom">
          <span className={`agenda-status-chip ${b.status}`}>
            {isOpenUnclaimed ? "Open job" : STATUS_LABEL[b.status]}
          </span>
          {b.guests ? <span className="agenda-guests">{b.guests}</span> : null}
          {hasAttention(b) ? <span className="attn-marker agenda-inline-marker">!</span> : null}
          {b.dispute_status === "open" ? <span className="dispute-marker agenda-inline-marker">!</span> : null}
          {needsConfirmation ? <span className="confirm-marker agenda-inline-marker">?</span> : null}
        </div>
      )}
    </div>
  );
}
