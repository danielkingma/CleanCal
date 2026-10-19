"use client";

import { useEffect, useRef } from "react";
import type { Booking } from "@/lib/types";
import MonthGrid from "./MonthGrid";

interface PropertyYearViewProps {
  year: number;
  bookings: Booking[]; // already scoped to the selected property
  onSelectBooking: (booking: Booking) => void;
  onSelectDate: (dateIso: string) => void;
  viewerId?: string;
  isStaffViewer?: boolean;
  cleanerNameById?: Record<string, string>;
  cleanerInitialById?: Record<string, string>;
}

export default function PropertyYearView({
  year,
  bookings,
  onSelectBooking,
  onSelectDate,
  viewerId,
  isStaffViewer,
  cleanerNameById,
  cleanerInitialById,
}: PropertyYearViewProps) {
  // On a phone the months stack in one long column, so bring the current
  // month into view instead of leaving the viewer at January. (Wider
  // screens show several months at once; nothing to scroll there.)
  const currentMonthRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (new Date().getFullYear() !== year) return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    currentMonthRef.current?.scrollIntoView({ block: "start" });
  }, [year]);
  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() : -1;

  return (
    <div className="py-year-grid">
      {Array.from({ length: 12 }, (_, m) => (
        <div
          key={m}
          ref={m === currentMonth ? currentMonthRef : undefined}
          // Leave room for the sticky top bar when scrolled into view.
          style={{ scrollMarginTop: 130, minWidth: 0 }}
        >
        <MonthGrid
          year={year}
          month={m}
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          onSelectDate={onSelectDate}
          viewerId={viewerId}
          isStaffViewer={isStaffViewer}
          cleanerNameById={cleanerNameById}
          cleanerInitialById={cleanerInitialById}
          // These 12 panels are too small to usefully show who's on a job
          // -- the booking platform (colour + badge) is the more useful
          // thing to show at this scale, same as it already did before
          // cleaner names/colours existed.
          showCleanerLabel={false}
        />
        </div>
      ))}
    </div>
  );
}
