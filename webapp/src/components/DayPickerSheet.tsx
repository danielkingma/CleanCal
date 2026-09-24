"use client";

import type { Booking } from "@/lib/types";
import AgendaCard from "./AgendaCard";

interface DayPickerSheetProps {
  dateLabel: string;
  bookings: Booking[];
  propertyNameById: Record<string, string>;
  onSelect: (booking: Booking) => void;
  onClose: () => void;
}

// Shown when tapping a day on the mobile Month grid lands on more than
// one clean that day (a same-day turnover) -- MonthGrid's bars are
// already individually tappable, but on a small screen two overlapping
// bar slivers are hard to hit precisely, so tapping the day itself offers
// this as a reliable fallback.
export default function DayPickerSheet({
  dateLabel,
  bookings,
  propertyNameById,
  onSelect,
  onClose,
}: DayPickerSheetProps) {
  return (
    <div className="overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <h2>{dateLabel}</h2>
        <div className="agenda-cards">
          {bookings.map((b) => (
            <AgendaCard
              key={b.id}
              booking={b}
              propertyName={propertyNameById[b.property_id] ?? "—"}
              onClick={() => onSelect(b)}
            />
          ))}
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <span />
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
