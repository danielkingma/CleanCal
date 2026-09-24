"use client";

import type { Booking } from "@/lib/types";
import MonthGrid from "./MonthGrid";

interface PropertyYearViewProps {
  year: number;
  bookings: Booking[]; // already scoped to the selected property
  onSelectBooking: (booking: Booking) => void;
  onSelectDate: (dateIso: string) => void;
}

export default function PropertyYearView({
  year,
  bookings,
  onSelectBooking,
  onSelectDate,
}: PropertyYearViewProps) {
  return (
    <div className="py-year-grid">
      {Array.from({ length: 12 }, (_, m) => (
        <MonthGrid
          key={m}
          year={year}
          month={m}
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          onSelectDate={onSelectDate}
        />
      ))}
    </div>
  );
}
