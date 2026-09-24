"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";
import NotificationsToggle from "./NotificationsToggle";
import Timeline from "./Timeline";
import MobileAgenda from "./MobileAgenda";
import MonthGrid from "./MonthGrid";
import DayPickerSheet from "./DayPickerSheet";
import PropertyYearView from "./PropertyYearView";
import BookingModal from "./BookingModal";
import {
  DAY_W_MONTH,
  DAY_W_WEEK,
  MONTH_NAMES,
  addDays,
  checkoutDate,
  fromISO,
  isoDate,
} from "@/lib/calendar-utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { isStaff, type Booking, type CleanerRating, type Profile, type Property } from "@/lib/types";

// Points at the published CleanCal Handbook artifact. Not part of this
// repo's own content -- update this if the handbook is ever republished
// somewhere else.
const HANDBOOK_URL = "https://claude.ai/artifact/DTYa9CziQcXdn6cGeYncAG";

interface CalendarAppProps {
  currentProfile: Profile;
  currentUserEmail: string;
  properties: Property[];
  initialBookings: Booking[];
  cleaners: Profile[];
  cleanerRatings: Record<string, CleanerRating>;
  cleanerUnavailableDates: Record<string, string[]>;
}

type View = "week" | "month" | "year";

interface ModalState {
  mode: "new" | "edit";
  booking?: Booking;
  presetPropertyId?: string;
  presetDate?: string;
}

export default function CalendarApp({
  currentProfile,
  currentUserEmail,
  properties,
  initialBookings,
  cleaners,
  cleanerRatings,
  cleanerUnavailableDates,
}: CalendarAppProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [view, setView] = useState<View>("month");
  const [yearPropertyId, setYearPropertyId] = useState(() => properties[0]?.id ?? "");
  const [cursor, setCursor] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [dayPicker, setDayPicker] = useState<{ dateIso: string; bookings: Booking[] } | null>(null);

  // Mobile has no Year tab (see the view-tabs below) -- if someone picked
  // Year on desktop and then narrowed the window, fall back to Month
  // everywhere below rather than rendering a tab that isn't offered.
  const derivedView: View = isMobile && view === "year" ? "month" : view;

  // Re-sync local state when the server component re-fetches (see
  // router.refresh() in handleDone) -- updating state during render here,
  // rather than in an effect, avoids an extra cascading render.
  const [syncedBookings, setSyncedBookings] = useState(initialBookings);
  if (initialBookings !== syncedBookings) {
    setSyncedBookings(initialBookings);
    setBookings(initialBookings);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          setBookings((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id: string }).id;
              return prev.filter((b) => b.id !== oldId);
            }
            const next = payload.new as Booking;
            const exists = prev.some((b) => b.id === next.id);
            return exists ? prev.map((b) => (b.id === next.id ? next : b)) : [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const days = useMemo(() => {
    if (derivedView === "month") {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1));
    }
    if (derivedView === "week") {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [];
  }, [derivedView, cursor]);

  const periodLabel = useMemo(() => {
    if (derivedView === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (derivedView === "week") {
      const start = addDays(cursor, -cursor.getDay());
      const end = addDays(start, 6);
      return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
    }
    return `${cursor.getFullYear()}`;
  }, [derivedView, cursor]);

  function navigate(dir: number) {
    setCursor((prev) => {
      const next = new Date(prev);
      if (derivedView === "month") next.setMonth(next.getMonth() + dir);
      else if (derivedView === "week") next.setDate(next.getDate() + dir * 7);
      else next.setFullYear(next.getFullYear() + dir);
      return next;
    });
  }

  // Tapping a day on the mobile Month grid: MonthGrid's bars are already
  // individually tappable (opens that booking directly), but two
  // same-day-turnover bars can be hard to hit precisely on a phone, so
  // tapping the day itself is a reliable fallback -- straight to the
  // booking if there's exactly one, a small picker if there's more.
  function handleMobileMonthDayTap(dateIso: string) {
    const dayBookings = bookings.filter(
      (b) => b.property_id === yearPropertyId && isoDate(checkoutDate(b)) === dateIso,
    );
    if (dayBookings.length === 1) {
      setModal({ mode: "edit", booking: dayBookings[0] });
    } else if (dayBookings.length > 1) {
      setDayPicker({ dateIso, bookings: dayBookings });
    }
  }

  function openNewModal(propertyId?: string, dateIso?: string) {
    if (!isStaff(currentProfile.role)) return;
    setModal({ mode: "new", presetPropertyId: propertyId, presetDate: dateIso });
  }
  function closeModal() {
    setModal(null);
  }
  function handleDone() {
    closeModal();
    router.refresh();
  }

  const isStaffUser = isStaff(currentProfile.role);

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div className="nav-controls">
          <button className="nav-btn" onClick={() => navigate(-1)} aria-label="Previous">
            ‹
          </button>
          <div className="period-label">{periodLabel}</div>
          <button className="nav-btn" onClick={() => navigate(1)} aria-label="Next">
            ›
          </button>
          <button className="today-btn" onClick={() => setCursor(new Date())}>
            Today
          </button>
        </div>
        <div className="view-tabs">
          {(isMobile
            ? ([
                { key: "week", label: "Cleaning List" },
                { key: "month", label: "Month" },
              ] as const)
            : ([
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
                { key: "year", label: "Year" },
              ] as const)
          ).map(({ key, label }) => (
            <button
              key={key}
              className={`view-tab${derivedView === key ? " active" : ""}`}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {(derivedView === "year" || (isMobile && derivedView === "month")) && properties.length > 0 ? (
          <select
            className="year-property-select"
            value={yearPropertyId}
            onChange={(e) => setYearPropertyId(e.target.value)}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="user-badge">
          <span className="role-pill">{currentProfile.role}</span>
          <span>{currentUserEmail}</span>
          <a
            href={HANDBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="signout-btn"
          >
            Handbook
          </a>
          <Link href="/history" className="signout-btn">
            History
          </Link>
          <Link href="/availability" className="signout-btn">
            Availability
          </Link>
          <Link href="/profile" className="signout-btn">
            My Profile
          </Link>
          <NotificationsToggle />
          <form action="/logout" method="post">
            <button type="submit" className="signout-btn">
              Sign out
            </button>
          </form>
        </div>
        {isStaffUser ? (
          <Link href="/dashboard" className="today-btn">
            Dashboard
          </Link>
        ) : null}
        {isStaffUser ? (
          <Link href="/reports" className="today-btn">
            Reports
          </Link>
        ) : null}
        {isStaffUser ? (
          <Link href="/properties" className="today-btn">
            Properties
          </Link>
        ) : null}
        {isStaffUser ? (
          <Link href="/cleaners" className="today-btn">
            Cleaners
          </Link>
        ) : null}
        {isStaffUser ? (
          <button
            className="new-btn"
            onClick={() => openNewModal(properties[0]?.id, isoDate(cursor))}
          >
            + New booking
          </button>
        ) : null}
      </div>

      <main>
        <div className="legend">
          <div className="legend-item">
            <span className="dot to-clean" /> To clean
          </div>
          <div className="legend-item">
            <span className="dot in-progress" /> In progress
          </div>
          <div className="legend-item">
            <span className="dot complete" /> Complete
          </div>
          <div className="legend-item">
            <span className="attn-marker" style={{ position: "static" }}>
              !
            </span>{" "}
            Requires attention
          </div>
          {derivedView !== "year" && !(isMobile && derivedView === "month") ? (
            <div className="prop-count">{properties.length} properties</div>
          ) : null}
        </div>

        {derivedView === "year" ? (
          yearPropertyId ? (
            <PropertyYearView
              year={cursor.getFullYear()}
              bookings={bookings.filter((b) => b.property_id === yearPropertyId)}
              onSelectBooking={(booking) => setModal({ mode: "edit", booking })}
              onSelectDate={(d) => {
                setCursor(fromISO(d));
                setView("month");
              }}
            />
          ) : (
            <p className="photo-note">Add a property to see its year calendar here.</p>
          )
        ) : isMobile && derivedView === "month" ? (
          yearPropertyId ? (
            <MonthGrid
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
              bookings={bookings.filter((b) => b.property_id === yearPropertyId)}
              onSelectBooking={(booking) => setModal({ mode: "edit", booking })}
              onSelectDate={handleMobileMonthDayTap}
              showTitle={false}
            />
          ) : (
            <p className="photo-note">Add a property to see its month calendar here.</p>
          )
        ) : isMobile ? (
          <MobileAgenda
            days={days}
            properties={properties}
            bookings={bookings}
            onBarClick={(booking) => setModal({ mode: "edit", booking })}
          />
        ) : (
          <Timeline
            days={days}
            dayW={derivedView === "week" ? DAY_W_WEEK : DAY_W_MONTH}
            weekly={derivedView === "week"}
            properties={properties}
            bookings={bookings}
            onBarClick={(booking) => setModal({ mode: "edit", booking })}
            onTrackClick={(propertyId, dateIso) => openNewModal(propertyId, dateIso)}
            canCreate={isStaffUser}
          />
        )}
      </main>

      {modal ? (
        <BookingModal
          mode={modal.mode}
          role={currentProfile.role}
          currentUserId={currentProfile.id}
          properties={properties}
          cleaners={cleaners}
          cleanerRatings={cleanerRatings}
          cleanerUnavailableDates={cleanerUnavailableDates}
          booking={modal.booking}
          presetPropertyId={modal.presetPropertyId}
          presetDate={modal.presetDate}
          onClose={closeModal}
          onDone={handleDone}
        />
      ) : null}

      {dayPicker ? (
        <DayPickerSheet
          dateLabel={fromISO(dayPicker.dateIso).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          bookings={dayPicker.bookings}
          propertyNameById={Object.fromEntries(properties.map((p) => [p.id, p.name]))}
          onSelect={(booking) => {
            setDayPicker(null);
            setModal({ mode: "edit", booking });
          }}
          onClose={() => setDayPicker(null)}
        />
      ) : null}
    </div>
  );
}
