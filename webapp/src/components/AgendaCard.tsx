"use client";

import { useState } from "react";
import { claimUnassignedBooking } from "@/app/calendar/actions";
import { STATUS_LABEL, hasAttention, isClaimableBooking } from "@/lib/calendar-utils";
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
  // check the box to claim it" treatment below never applies to them.
  isStaffViewer?: boolean;
  // Staff view only -- resolves booking.assigned_cleaner_id to a name,
  // shown next to the broom mark below.
  cleanerNameById?: Record<string, string>;
  // Only applied when showCleanerColor is set.
  cleanerColorById?: Record<string, string>;
  // Set wherever this card's full name should be tinted in the
  // cleaner's own favourite colour -- the Assigned/Completed tabs (see
  // MobileAgenda.tsx) and the "which of these" list a tap on a
  // same-day-turnover day opens (DayPickerSheet.tsx), so the same
  // colour-coding used on the calendar bars carries through here too.
  showCleanerColor?: boolean;
}

// A single clean, shown as a full-width tappable card -- used by
// MobileAgenda's day sections and by DayPickerSheet's "which of these"
// list, so both look and behave the same.
export default function AgendaCard({
  booking: b,
  propertyName,
  onClick,
  viewerId,
  isStaffViewer,
  cleanerNameById,
  cleanerColorById,
  showCleanerColor,
}: AgendaCardProps) {
  const [pending, setPending] = useState(false);
  const isOpenUnclaimed = b.is_open_job && !b.assigned_cleaner_id;
  const isMine = viewerId != null && b.assigned_cleaner_id === viewerId;
  const needsConfirmation = isMine && !b.is_open_job && !b.assignment_confirmed;
  const isClaimable = isClaimableBooking(b, viewerId, Boolean(isStaffViewer));
  // Nothing about who's on it, or where it came from, shows on a card the
  // viewer can only claim -- it isn't theirs to see yet, only to take for
  // themselves.
  const platform = isClaimable ? undefined : getPlatformBadge(b.platform_label);
  // Staff can't tell who's on a job without opening it otherwise -- shown
  // by name (not just a marker) since this list has the room for it. A
  // cleaner viewing their own assigned job gets the same treatment, since
  // seeing their own name in their own colour is the whole point of
  // showCleanerColor below -- it just never applies to a card that's
  // someone else's job on a cleaner's shared-schedule views.
  const assignedCleanerName =
    b.assigned_cleaner_id && (isStaffViewer || isMine)
      ? (cleanerNameById?.[b.assigned_cleaner_id] ?? "Cleaner")
      : null;
  const assignedCleanerColor =
    showCleanerColor && b.assigned_cleaner_id ? cleanerColorById?.[b.assigned_cleaner_id] : undefined;

  async function handleClaim() {
    setPending(true);
    try {
      await claimUnassignedBooking(b.id);
    } catch {
      // Best-effort from an inline calendar checkbox -- opening the
      // booking's modal (which surfaces a real error banner) is the
      // fallback if a claim needs troubleshooting.
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`agenda-card ${b.status}${isOpenUnclaimed ? " open-job" : ""}${isMine ? " mine" : ""}${needsConfirmation ? " needs-confirmation" : ""}${isClaimable ? " requestable" : ""}`}
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
      {isClaimable ? (
        <div className="agenda-card-bottom">
          <label className="bar-request-check" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={false} disabled={pending} onChange={handleClaim} />
            Assign
          </label>
        </div>
      ) : (
        <div className="agenda-card-bottom">
          <span className={`agenda-status-chip ${b.status}`}>
            {isOpenUnclaimed ? "Open job" : STATUS_LABEL[b.status]}
          </span>
          {assignedCleanerName ? (
            <span className="agenda-cleaner-tag">
              🧹{" "}
              {assignedCleanerColor ? (
                <span className="cleaner-color-dot" style={{ background: assignedCleanerColor }} />
              ) : null}
              {assignedCleanerName}
            </span>
          ) : null}
          {b.guests ? <span className="agenda-guests">{b.guests}</span> : null}
          {hasAttention(b) ? <span className="attn-marker agenda-inline-marker">!</span> : null}
          {b.dispute_status === "open" ? <span className="dispute-marker agenda-inline-marker">!</span> : null}
          {needsConfirmation ? <span className="confirm-marker agenda-inline-marker">?</span> : null}
        </div>
      )}
    </div>
  );
}
