"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";
import Dropdown from "./Dropdown";
import NotificationsToggle from "./NotificationsToggle";
import Timeline from "./Timeline";
import MobileAgenda from "./MobileAgenda";
import MonthGrid from "./MonthGrid";
import DayPickerSheet from "./DayPickerSheet";
import PropertyYearView from "./PropertyYearView";
import BookingModal from "./BookingModal";
import TrialNotice from "./TrialNotice";
import {
  DAY_W_MONTH,
  DAY_W_WEEK,
  MONTH_NAMES,
  addDays,
  checkoutDate,
  fromISO,
  isoDate,
  scopeBookingForViewer,
} from "@/lib/calendar-utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { ALL_PLATFORM_BADGES, getPlatformBadge } from "@/lib/platform-badge";
import { isStaff, type Booking, type CleanerRating, type Profile, type Property } from "@/lib/types";

// Well-known platforms worth calling out by name directly in the legend;
// anything else still gets its own badge on the calendar (see
// platform-badge.ts) -- the full color key, including these three, is
// also listed in the "For more" dropdown below.
const LEGEND_PLATFORMS = ["Airbnb", "Vrbo", "Booking.com"];
const OTHER_PLATFORM_COLOR = "#5B6560";

interface CalendarAppProps {
  currentProfile: Profile;
  currentUserEmail: string;
  properties: Property[];
  initialBookings: Booking[];
  cleaners: Profile[];
  cleanerRatings: Record<string, CleanerRating>;
  cleanerUnavailableDates: Record<string, string[]>;
  trialEndsAt: string | null;
}

type View = "assigned" | "week" | "month" | "year";

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
  trialEndsAt,
}: CalendarAppProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [view, setView] = useState<View>("month");
  const [yearPropertyId, setYearPropertyId] = useState(() => properties[0]?.id ?? "");

  // properties[0]?.id above only ever runs once, at mount -- if a cleaner's
  // properties list was empty then and later gains an entry (e.g. the
  // router.refresh() below after a new assignment arrives over realtime),
  // this keeps the Year view's selection in sync during render instead of
  // staying stuck on an empty/stale id (same pattern as syncedBookings
  // just below).
  const [syncedProperties, setSyncedProperties] = useState(properties);
  if (properties !== syncedProperties) {
    setSyncedProperties(properties);
    if (!properties.some((p) => p.id === yearPropertyId)) {
      setYearPropertyId(properties[0]?.id ?? "");
    }
  }
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
    const staffViewer = isStaff(currentProfile.role);
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setBookings((prev) => prev.filter((b) => b.id !== oldId));
            return;
          }

          // Realtime broadcasts the raw row straight from Postgres --
          // every org member can now SELECT every booking (see
          // supabase/migrations/0020_cleaner_full_calendar.sql), so this
          // has to apply the same redaction calendar/page.tsx applies on
          // first load, or a live update would hand a cleaner guest/
          // rating/dispute detail on a job that isn't theirs.
          const next = scopeBookingForViewer(payload.new as Booking, currentProfile.id, staffViewer);
          setBookings((prev) => {
            const exists = prev.some((b) => b.id === next.id);
            return exists ? prev.map((b) => (b.id === next.id ? next : b)) : [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfile.id, currentProfile.role]);

  // On mobile the "week" tab is relabelled "Cleaning List" and shows a
  // month's worth of days as a vertical agenda instead of a literal week --
  // it should move and label itself exactly like the Month tab, just
  // rendered as a list (MobileAgenda) rather than a grid (MonthGrid).
  const isCleaningList = isMobile && derivedView === "week";
  // The "Assigned" tab is a day-by-day agenda too (same layout as the
  // mobile Cleaning List), just filtered to the cleaner's own jobs below
  // instead of switching layouts -- so it shares the same month-of-days
  // period as month/isCleaningList rather than getting its own.
  const isMonthPeriod = derivedView === "month" || isCleaningList || derivedView === "assigned";

  const days = useMemo(() => {
    if (isMonthPeriod) {
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
  }, [derivedView, isMonthPeriod, cursor]);

  const periodLabel = useMemo(() => {
    if (isMonthPeriod) return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (derivedView === "week") {
      const start = addDays(cursor, -cursor.getDay());
      const end = addDays(start, 6);
      return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
    }
    return `${cursor.getFullYear()}`;
  }, [derivedView, isMonthPeriod, cursor]);

  function navigate(dir: number) {
    setCursor((prev) => {
      const next = new Date(prev);
      if (isMonthPeriod) next.setMonth(next.getMonth() + dir);
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
  // Shown wherever there's nothing to display because `properties` is
  // empty -- a cleaner only ever sees properties tied to a booking
  // assigned to them or posted Open (see calendar/page.tsx), so "add a
  // property" is both wrong (they can't) and misleading about why.
  const noPropertiesMessage = isStaffUser
    ? "Add a property to see your calendar here."
    : "You don't have any jobs assigned yet. Ask an owner or manager to assign you a booking, or check the open job board.";

  return (
    <div>
      <div className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <form action="/logout" method="post">
            <button type="submit" className="signout-btn">
              Sign out
            </button>
          </form>
        </div>

        <div className="topbar-row">
          <div className="user-badge">
            <span className="role-pill">{currentProfile.role}</span>
            <span>{currentUserEmail}</span>
          </div>
        </div>

        <div className="topbar-row">
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
            {(
              [
                // Only a cleaner has a personal subset worth calling out --
                // an Owner/Manager's own jobs aren't a distinct concept, so
                // this tab is theirs alone, and it goes leftmost since it's
                // the view they'll want most often.
                ...(isStaffUser ? [] : [{ key: "assigned", label: "Assigned" }]),
                ...(isMobile
                  ? [
                      { key: "week", label: "Cleaning List" },
                      { key: "month", label: "Month" },
                    ]
                  : [
                      { key: "week", label: "Week" },
                      { key: "month", label: "Month" },
                      { key: "year", label: "Year" },
                    ]),
              ] as { key: View; label: string }[]
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
          {isStaffUser ? (
            <Dropdown label="Manage" triggerClassName="today-btn" align="left">
              <Link href="/dashboard" className="dropdown-item">
                Dashboard
              </Link>
              <Link href="/reports" className="dropdown-item">
                Reports
              </Link>
              <Link href="/properties" className="dropdown-item">
                Properties
              </Link>
              <Link href="/cleaners" className="dropdown-item">
                Cleaners
              </Link>
            </Dropdown>
          ) : null}
          {isStaffUser ? (
            <button
              className="new-btn"
              onClick={() => openNewModal(properties[0]?.id, isoDate(cursor))}
            >
              + New booking
            </button>
          ) : null}
          <Dropdown label="Menu" triggerClassName="signout-btn">
            <Link href="/handbook" className="dropdown-item">
              Handbook
            </Link>
            <Link href="/history" className="dropdown-item">
              History
            </Link>
            <Link href="/availability" className="dropdown-item">
              Availability
            </Link>
            <Link href="/profile" className="dropdown-item">
              My Profile
            </Link>
            <NotificationsToggle className="dropdown-item" />
          </Dropdown>
        </div>
      </div>

      {isStaffUser ? <TrialNotice trialEndsAt={trialEndsAt} /> : null}

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
          <div className="legend-group">
            {LEGEND_PLATFORMS.map((name) => {
              const badge = getPlatformBadge(name);
              if (!badge) return null;
              return (
                <div className="legend-item" key={name}>
                  <span className="legend-badge" style={{ background: badge.color }}>
                    {badge.code}
                  </span>
                  {badge.name}
                </div>
              );
            })}
            <Dropdown label="For more" triggerClassName="legend-more-btn" align="right">
              <div className="legend-platform-panel">
                {ALL_PLATFORM_BADGES.map((badge) => (
                  <div className="legend-item" key={badge.name}>
                    <span className="legend-badge" style={{ background: badge.color }}>
                      {badge.code}
                    </span>
                    {badge.name}
                  </div>
                ))}
                <div className="legend-item">
                  <span className="legend-badge" style={{ background: OTHER_PLATFORM_COLOR }}>
                    •
                  </span>
                  Other (anything else you connect)
                </div>
              </div>
            </Dropdown>
            {derivedView !== "year" && derivedView !== "assigned" && !(isMobile && derivedView === "month") ? (
              <div className="prop-count">{properties.length} properties</div>
            ) : null}
          </div>
        </div>

        {derivedView === "assigned" ? (
          <MobileAgenda
            days={days}
            properties={properties}
            bookings={bookings.filter((b) => b.assigned_cleaner_id === currentProfile.id)}
            onBarClick={(booking) => setModal({ mode: "edit", booking })}
            viewerId={currentProfile.id}
          />
        ) : derivedView === "year" ? (
          yearPropertyId ? (
            <PropertyYearView
              year={cursor.getFullYear()}
              bookings={bookings.filter((b) => b.property_id === yearPropertyId)}
              onSelectBooking={(booking) => setModal({ mode: "edit", booking })}
              onSelectDate={(d) => {
                setCursor(fromISO(d));
                setView("month");
              }}
              viewerId={currentProfile.id}
            />
          ) : (
            <p className="photo-note">{noPropertiesMessage}</p>
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
              viewerId={currentProfile.id}
            />
          ) : (
            <p className="photo-note">{noPropertiesMessage}</p>
          )
        ) : properties.length === 0 ? (
          <p className="photo-note">{noPropertiesMessage}</p>
        ) : isMobile ? (
          <MobileAgenda
            days={days}
            properties={properties}
            bookings={bookings}
            onBarClick={(booking) => setModal({ mode: "edit", booking })}
            viewerId={currentProfile.id}
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
            viewerId={currentProfile.id}
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
          viewerId={currentProfile.id}
        />
      ) : null}
    </div>
  );
}
