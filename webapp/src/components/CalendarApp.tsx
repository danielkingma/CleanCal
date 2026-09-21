"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";
import Timeline from "./Timeline";
import YearView from "./YearView";
import BookingModal from "./BookingModal";
import {
  DAY_W_MONTH,
  DAY_W_WEEK,
  MONTH_NAMES,
  addDays,
  fromISO,
  isoDate,
} from "@/lib/calendar-utils";
import type { Booking, CleanerRating, Profile, Property } from "@/lib/types";

interface CalendarAppProps {
  currentProfile: Profile;
  currentUserEmail: string;
  properties: Property[];
  initialBookings: Booking[];
  cleaners: Profile[];
  cleanerRatings: Record<string, CleanerRating>;
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
}: CalendarAppProps) {
  const router = useRouter();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [modal, setModal] = useState<ModalState | null>(null);

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
    if (view === "month") {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1));
    }
    if (view === "week") {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [];
  }, [view, cursor]);

  const periodLabel = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") {
      const start = addDays(cursor, -cursor.getDay());
      const end = addDays(start, 6);
      return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
    }
    return `${cursor.getFullYear()}`;
  }, [view, cursor]);

  function navigate(dir: number) {
    setCursor((prev) => {
      const next = new Date(prev);
      if (view === "month") next.setMonth(next.getMonth() + dir);
      else if (view === "week") next.setDate(next.getDate() + dir * 7);
      else next.setFullYear(next.getFullYear() + dir);
      return next;
    });
  }

  function openNewModal(propertyId?: string, dateIso?: string) {
    if (currentProfile.role !== "admin") return;
    setModal({ mode: "new", presetPropertyId: propertyId, presetDate: dateIso });
  }
  function closeModal() {
    setModal(null);
  }
  function handleDone() {
    closeModal();
    router.refresh();
  }

  const isAdmin = currentProfile.role === "admin";

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
          {(["week", "month", "year"] as const).map((v) => (
            <button
              key={v}
              className={`view-tab${view === v ? " active" : ""}`}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="user-badge">
          <span className="role-pill">{currentProfile.role}</span>
          <span>{currentUserEmail}</span>
          <Link href="/profile" className="signout-btn">
            My Profile
          </Link>
          <form action="/logout" method="post">
            <button type="submit" className="signout-btn">
              Sign out
            </button>
          </form>
        </div>
        {isAdmin ? (
          <Link href="/properties" className="today-btn">
            Properties
          </Link>
        ) : null}
        {isAdmin ? (
          <Link href="/cleaners" className="today-btn">
            Cleaners
          </Link>
        ) : null}
        {isAdmin ? (
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
          {view !== "year" ? <div className="prop-count">{properties.length} properties</div> : null}
        </div>

        {view === "year" ? (
          <YearView
            year={cursor.getFullYear()}
            bookings={bookings}
            onSelectMonth={(m) => {
              setCursor(new Date(cursor.getFullYear(), m, 1));
              setView("month");
            }}
            onSelectDate={(d) => {
              setCursor(fromISO(d));
              setView("month");
            }}
          />
        ) : (
          <Timeline
            days={days}
            dayW={view === "week" ? DAY_W_WEEK : DAY_W_MONTH}
            weekly={view === "week"}
            properties={properties}
            bookings={bookings}
            onBarClick={(booking) => setModal({ mode: "edit", booking })}
            onTrackClick={(propertyId, dateIso) => openNewModal(propertyId, dateIso)}
            canCreate={isAdmin}
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
          booking={modal.booking}
          presetPropertyId={modal.presetPropertyId}
          presetDate={modal.presetDate}
          onClose={closeModal}
          onDone={handleDone}
        />
      ) : null}
    </div>
  );
}
