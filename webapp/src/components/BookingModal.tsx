"use client";

import { useEffect, useRef, useState } from "react";
import {
  claimOpenBooking,
  createBooking,
  declineAssignedBooking,
  deleteBooking,
  payCleanerForBooking,
  postDisputeMessage,
  rateBooking,
  releaseOpenBooking,
  resolveDispute,
  updateBookingAdmin,
  updateBookingCleaner,
  type BookingInput,
} from "@/app/calendar/actions";
import { createClient } from "@/lib/supabase/client";
import { buildChecklistSections, addDays, daysBetween, fromISO, isoDate } from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";
import {
  isStaff,
  type Booking,
  type BookingStatus,
  type Checklist,
  type CleanerRating,
  type DisputeMessage,
  type Profile,
  type Property,
  type Role,
} from "@/lib/types";

const PHOTOS_BUCKET = "booking-photos";

interface PhotoItem {
  id: string;
  path: string;
  url: string;
}

interface BookingModalProps {
  mode: "new" | "edit";
  role: Role;
  currentUserId: string;
  properties: Property[];
  cleaners: Profile[];
  cleanerRatings: Record<string, CleanerRating>;
  cleanerUnavailableDates: Record<string, string[]>;
  booking?: Booking;
  presetPropertyId?: string;
  presetDate?: string;
  onClose: () => void;
  onDone: () => void;
}

const STATUS_OPTIONS: BookingStatus[] = ["to-clean", "in-progress", "complete"];
const STATUS_LABEL: Record<BookingStatus, string> = {
  "to-clean": "To Clean",
  "in-progress": "In Progress",
  complete: "Complete",
};

export default function BookingModal({
  mode,
  role,
  currentUserId,
  properties,
  cleaners,
  cleanerRatings,
  cleanerUnavailableDates,
  booking,
  presetPropertyId,
  presetDate,
  onClose,
  onDone,
}: BookingModalProps) {
  const isStaffUser = isStaff(role);
  const isAssignedCleaner = role === "cleaner" && !!booking && booking.assigned_cleaner_id === currentUserId;
  const isUnclaimedOpenJob =
    role === "cleaner" && !!booking && booking.is_open_job && !booking.assigned_cleaner_id;
  const isClaimedFromOpen = role === "cleaner" && !!booking && booking.is_open_job && isAssignedCleaner;
  const isDeclinableAssigned =
    role === "cleaner" &&
    !!booking &&
    !booking.is_open_job &&
    isAssignedCleaner &&
    booking.status === "to-clean";
  const canEditCore = isStaffUser;
  const canEditCleaning = isStaffUser || isAssignedCleaner;
  const canSave = mode === "new" ? isStaffUser : canEditCleaning;

  const [propertyId, setPropertyId] = useState(
    booking?.property_id ?? presetPropertyId ?? properties[0]?.id ?? "",
  );
  const [checkinDate, setCheckinDate] = useState(booking?.checkin_date ?? presetDate ?? isoDate(new Date()));
  const [nights, setNights] = useState(booking?.nights ?? 2);
  const [checkoutStr, setCheckoutStr] = useState(() =>
    isoDate(addDays(fromISO(booking?.checkin_date ?? presetDate ?? isoDate(new Date())), booking?.nights ?? 2)),
  );
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [guests, setGuests] = useState(booking?.guests ?? "");
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? "to-clean");
  const [checklist, setChecklist] = useState<Checklist>(
    () => booking?.checklist ?? { oven: { checked: false, outcome: null } },
  );
  const [assignedCleanerId, setAssignedCleanerId] = useState<string | null>(
    booking?.assigned_cleaner_id ?? null,
  );
  const [isOpenJob, setIsOpenJob] = useState(booking?.is_open_job ?? false);
  const [linenPickup, setLinenPickup] = useState(booking?.linen_pickup ?? false);
  const [platformLabel, setPlatformLabel] = useState(booking?.platform_label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    if (!booking) return;
    setError(null);
    setClaiming(true);
    try {
      await claimOpenBooking(booking.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't claim this job.");
      setClaiming(false);
    }
  }

  async function handleRelease() {
    if (!booking) return;
    setError(null);
    setClaiming(true);
    try {
      await releaseOpenBooking(booking.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't release this job.");
      setClaiming(false);
    }
  }

  async function handleDecline() {
    if (!booking) return;
    const confirmed = window.confirm(
      "Decline this job? It goes back to the open job board for another cleaner to claim.",
    );
    if (!confirmed) return;
    setError(null);
    setClaiming(true);
    try {
      await declineAssignedBooking(booking.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't decline this job.");
      setClaiming(false);
    }
  }

  const [rating, setRating] = useState<number>(booking?.rating ?? 0);
  const [ratingComment, setRatingComment] = useState(booking?.rating_comment ?? "");
  const [savingRating, setSavingRating] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);

  async function handleSaveRating() {
    if (!booking || rating < 1) return;
    setSavingRating(true);
    setRatingSaved(false);
    try {
      await rateBooking(booking.id, rating, ratingComment);
      setRatingSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save rating.");
    } finally {
      setSavingRating(false);
    }
  }

  const [payingCleaner, setPayingCleaner] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);
  const property = properties.find((p) => p.id === propertyId);
  const assignedCleaner = cleaners.find((c) => c.id === booking?.assigned_cleaner_id);

  async function handlePayCleaner() {
    if (!booking) return;
    setPayingCleaner(true);
    setPayError(null);
    try {
      await payCleanerForBooking(booking.id);
      setJustPaid(true);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Couldn't pay cleaner.");
    } finally {
      setPayingCleaner(false);
    }
  }

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(mode === "edit");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Desktop: hovering a thumbnail previews it large, and moving off
  // closes it again. Touch has no hover, so tapping opens the same
  // preview "pinned" -- it stays open (a hover-leave elsewhere can't
  // close it) until the backdrop or close button is tapped.
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);
  const [lightboxPinned, setLightboxPinned] = useState(false);
  function openLightboxOnHover(photo: PhotoItem) {
    if (!lightboxPinned) setLightboxPhoto(photo);
  }
  function closeLightboxOnHoverEnd() {
    if (!lightboxPinned) setLightboxPhoto(null);
  }
  function openLightboxPinned(photo: PhotoItem) {
    setLightboxPhoto(photo);
    setLightboxPinned(true);
  }
  function closeLightbox() {
    setLightboxPhoto(null);
    setLightboxPinned(false);
  }

  const canSeeDispute = mode === "edit" && !!booking?.assigned_cleaner_id && (isStaffUser || isAssignedCleaner);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [disputeLoading, setDisputeLoading] = useState(canSeeDispute);
  const [newMessage, setNewMessage] = useState("");
  const [postingMessage, setPostingMessage] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!canSeeDispute || !booking) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data } = await supabase
        .from("dispute_messages")
        .select("id, author_name, author_role, body, created_at")
        .eq("booking_id", booking.id)
        .order("created_at");
      if (!cancelled) {
        setDisputeMessages((data as DisputeMessage[] | null) ?? []);
        setDisputeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeDispute, booking?.id]);

  async function handlePostMessage() {
    if (!booking || !newMessage.trim()) return;
    setPostingMessage(true);
    setError(null);
    try {
      await postDisputeMessage(booking.id, newMessage);
      setDisputeMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          author_name: "You",
          author_role: role,
          body: newMessage.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post message.");
    } finally {
      setPostingMessage(false);
    }
  }

  async function handleResolveDispute() {
    if (!booking) return;
    setResolving(true);
    setError(null);
    try {
      await resolveDispute(booking.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't resolve dispute.");
      setResolving(false);
    }
  }

  useEffect(() => {
    if (mode !== "edit" || !booking) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("photos")
        .select("id, storage_path")
        .eq("booking_id", booking.id)
        .order("created_at");
      if (fetchError || !data) {
        if (!cancelled) setPhotosLoading(false);
        return;
      }
      const withUrls = await Promise.all(
        data.map(async (p) => {
          const { data: signed } = await supabase.storage
            .from(PHOTOS_BUCKET)
            .createSignedUrl(p.storage_path, 3600);
          return { id: p.id as string, path: p.storage_path as string, url: signed?.signedUrl ?? "" };
        }),
      );
      if (!cancelled) {
        setPhotos(withUrls);
        setPhotosLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, booking]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !booking || !canEditCleaning) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(fileList)) {
      try {
        const path = `${booking.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file);
        if (uploadError) throw uploadError;

        const { data: row, error: insertError } = await supabase
          .from("photos")
          .insert({ booking_id: booking.id, storage_path: path, uploaded_by: currentUserId })
          .select("id")
          .single();
        if (insertError) throw insertError;

        const { data: signed } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(path, 3600);
        setPhotos((prev) => [...prev, { id: row.id as string, path, url: signed?.signedUrl ?? "" }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Photo upload failed.");
      }
    }
    setUploading(false);
  }

  async function handleRemovePhoto(photo: PhotoItem) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    const supabase = createClient();
    await supabase.storage.from(PHOTOS_BUCKET).remove([photo.path]);
    await supabase.from("photos").delete().eq("id", photo.id);
  }

  function onCheckinChange(value: string) {
    setCheckinDate(value);
    setCheckoutStr(isoDate(addDays(fromISO(value), Math.max(1, nights))));
  }
  function onNightsChange(value: number) {
    const n = Math.max(1, value || 1);
    setNights(n);
    setCheckoutStr(isoDate(addDays(fromISO(checkinDate), n)));
  }
  function onCheckoutChange(value: string) {
    const diff = daysBetween(fromISO(checkinDate), fromISO(value));
    if (diff >= 1) {
      setCheckoutStr(value);
      setNights(diff);
    } else {
      const fixed = isoDate(addDays(fromISO(checkinDate), 1));
      setCheckoutStr(fixed);
      setNights(1);
    }
  }

  function toggleChecklistItem(key: keyof Checklist, checked: boolean) {
    setChecklist((prev) => ({ ...prev, [key]: checked }));
  }
  function toggleOvenChecked(checked: boolean) {
    setChecklist((prev) => ({
      ...prev,
      oven: { checked, outcome: checked ? (prev.oven?.outcome ?? null) : null },
    }));
  }
  function setOvenOutcome(outcome: "cleaned" | "attention") {
    setChecklist((prev) => ({ ...prev, oven: { checked: true, outcome } }));
  }
  function toggleAttentionFlag(flagged: boolean) {
    setChecklist((prev) => ({
      ...prev,
      attention: { flagged, note: flagged ? (prev.attention?.note ?? "") : "" },
    }));
  }
  function setAttentionNote(note: string) {
    setChecklist((prev) => ({ ...prev, attention: { flagged: true, note } }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (isStaffUser) {
        const input: BookingInput = {
          property_id: propertyId,
          checkin_date: checkinDate,
          nights,
          status,
          notes,
          guests,
          checklist,
          assigned_cleaner_id: assignedCleanerId,
          is_open_job: isOpenJob,
          linen_pickup: linenPickup,
          platform_label: platformLabel.trim() || null,
        };
        if (mode === "new") {
          await createBooking(input);
        } else if (booking) {
          await updateBookingAdmin(booking.id, input);
        }
      } else if (booking && isAssignedCleaner) {
        await updateBookingCleaner(booking.id, status, checklist);
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!booking) return;
    setError(null);
    setSaving(true);
    try {
      await deleteBooking(booking.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const oven = checklist.oven ?? { checked: false, outcome: null };
  const attention = checklist.attention ?? { flagged: false, note: "" };
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const platform = getPlatformBadge(platformLabel);
  const assignedCleanerUnavailable =
    !!assignedCleanerId && (cleanerUnavailableDates[assignedCleanerId] ?? []).includes(checkoutStr);

  return (
    <div className="overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "new" ? "New booking" : "Edit booking"}
          {platform ? (
            <span className="source-pill" style={{ background: platform.color }}>
              {platform.name}
            </span>
          ) : null}
        </h2>

        {error ? <div className="error-banner">{error}</div> : null}
        {mode === "edit" && role === "cleaner" && !isAssignedCleaner && !isUnclaimedOpenJob ? (
          <div className="error-banner">This booking isn&apos;t assigned to you — view only.</div>
        ) : null}
        {isUnclaimedOpenJob ? (
          <div className="info-banner">This job is open — claim it below to take it on.</div>
        ) : null}
        {mode === "edit" && booking?.ical_missing_since ? (
          <div className="error-banner">
            No longer in the source calendar as of {new Date(booking.ical_missing_since).toLocaleDateString()} —
            the guest may have cancelled. Review and delete if so.
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="fProperty">Property</label>
          <select
            id="fProperty"
            value={propertyId}
            disabled={!canEditCore}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="fGuests">Guest/s</label>
          <input
            id="fGuests"
            type="text"
            value={guests}
            disabled={!canEditCore}
            placeholder="Guest name(s)"
            onChange={(e) => setGuests(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="fPlatform">Booking platform</label>
          <input
            id="fPlatform"
            type="text"
            list="platformSuggestions"
            value={platformLabel}
            disabled={!canEditCore}
            placeholder="e.g. Airbnb, Vrbo, Booking.com, Direct"
            onChange={(e) => setPlatformLabel(e.target.value)}
          />
          <datalist id="platformSuggestions">
            <option value="Airbnb" />
            <option value="Vrbo" />
            <option value="Booking.com" />
            <option value="Expedia" />
            <option value="Direct" />
          </datalist>
        </div>

        {selectedProperty?.access_instructions ? (
          <div className="field">
            <label>Access instructions</label>
            <p className="access-note">{selectedProperty.access_instructions}</p>
          </div>
        ) : null}

        <div className="two-col">
          <div className="field">
            <label htmlFor="fDate">Check-in</label>
            <input
              id="fDate"
              type="date"
              value={checkinDate}
              disabled={!canEditCore}
              onChange={(e) => onCheckinChange(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="fCheckout">Checkout</label>
            <input
              id="fCheckout"
              type="date"
              value={checkoutStr}
              disabled={!canEditCore}
              onChange={(e) => onCheckoutChange(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="fNights">Nights</label>
          <input
            id="fNights"
            type="number"
            min={1}
            max={30}
            value={nights}
            disabled={!canEditCore}
            onChange={(e) => onNightsChange(parseInt(e.target.value, 10))}
          />
        </div>

        {isStaffUser ? (
          <div className="field">
            <label>Assignment</label>
            <div className="segmented-row">
              <button
                type="button"
                className={`segmented-opt${!isOpenJob ? " sel" : ""}`}
                onClick={() => setIsOpenJob(false)}
              >
                Reserved for a cleaner
              </button>
              <button
                type="button"
                className={`segmented-opt${isOpenJob ? " sel" : ""}`}
                onClick={() => {
                  setIsOpenJob(true);
                  setAssignedCleanerId(null);
                }}
              >
                Open — any cleaner can claim
              </button>
            </div>
          </div>
        ) : null}

        {isStaffUser ? (
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={linenPickup}
                onChange={(e) => setLinenPickup(e.target.checked)}
              />
              Cleaner takes linen off-site to clean
            </label>
            {linenPickup ? (
              <p className="access-note">
                Adds $
                {(
                  ((selectedProperty?.linen_box_count ?? 0) * (selectedProperty?.linen_fee_cents ?? 0)) /
                  100
                ).toFixed(2)}{" "}
                to this cleaner&apos;s payout ({selectedProperty?.linen_box_count ?? 0} linen box
                {(selectedProperty?.linen_box_count ?? 0) === 1 ? "" : "es"} × $
                {((selectedProperty?.linen_fee_cents ?? 0) / 100).toFixed(2)}).
              </p>
            ) : null}
          </div>
        ) : null}

        {isStaffUser && !isOpenJob ? (
          <div className="field">
            <label htmlFor="fCleaner">Assigned cleaner</label>
            <select
              id="fCleaner"
              value={assignedCleanerId ?? ""}
              onChange={(e) => setAssignedCleanerId(e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {cleaners.map((c) => {
                const r = cleanerRatings[c.id];
                const label = r ? `${c.name || c.id} — ★${r.average.toFixed(1)} (${r.count})` : c.name || c.id;
                return (
                  <option key={c.id} value={c.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            {assignedCleanerUnavailable ? (
              <p className="error-banner" style={{ marginTop: 8 }}>
                {cleaners.find((c) => c.id === assignedCleanerId)?.name || "This cleaner"} marked
                themselves unavailable on {new Date(checkoutStr).toLocaleDateString()} — the clean date
                for this booking.
              </p>
            ) : null}
          </div>
        ) : null}

        {isStaffUser && isOpenJob ? (
          <div className="field">
            <p className="access-note">
              {booking?.assigned_cleaner_id
                ? `Claimed by ${cleaners.find((c) => c.id === booking.assigned_cleaner_id)?.name || "a cleaner"}.`
                : "Posted to the open job board — any cleaner can claim it from their calendar."}
            </p>
          </div>
        ) : null}

        <div className="field">
          <label>Cleaning status</label>
          <div className="status-row">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`status-opt ${s}${status === s ? " sel" : ""}`}
                disabled={!canEditCleaning}
                onClick={() => setStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="fNotes">Notes</label>
          <textarea
            id="fNotes"
            value={notes}
            disabled={!canEditCore}
            placeholder="e.g. Late checkout, extra towels needed"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {mode === "edit" ? (
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={attention.flagged}
                disabled={!canEditCleaning}
                onChange={(e) => toggleAttentionFlag(e.target.checked)}
              />
              Needs attention
            </label>
            {attention.flagged ? (
              <textarea
                value={attention.note}
                disabled={!canEditCleaning}
                placeholder="What does the host need to know about?"
                onChange={(e) => setAttentionNote(e.target.value)}
                style={{ marginTop: 8 }}
              />
            ) : null}
          </div>
        ) : null}

        {mode === "edit" ? (
          <div className="clean-section">
            <h3>Cleaning checklist</h3>
            {buildChecklistSections(selectedProperty).map((sec) => {
              // The oven is the one appliance worth flagging for a
              // host's attention rather than just ticking off (see its
              // outcome buttons below), so it's tallied and rendered
              // alongside Kitchen's other items rather than as its own
              // section.
              const isKitchen = sec.section === "Kitchen";
              const totalCount = sec.items.length + (isKitchen ? 1 : 0);
              const doneCount =
                sec.items.filter((item) => Boolean(checklist[item.key])).length +
                (isKitchen && oven.checked ? 1 : 0);
              return (
                <details className="checklist-section" key={sec.section}>
                  <summary>
                    <span>{sec.section}</span>
                    <span className="checklist-count">
                      {doneCount}/{totalCount}
                    </span>
                  </summary>
                  <div className="checklist-section-body">
                    {sec.items.map((item) => (
                      <label className="checklist-item" key={item.key}>
                        <input
                          type="checkbox"
                          disabled={!canEditCleaning}
                          checked={Boolean(checklist[item.key])}
                          onChange={(e) => toggleChecklistItem(item.key, e.target.checked)}
                        />
                        {item.label}
                      </label>
                    ))}
                    {isKitchen ? (
                      <>
                        <label className="checklist-item">
                          <input
                            type="checkbox"
                            disabled={!canEditCleaning}
                            checked={oven.checked}
                            onChange={(e) => toggleOvenChecked(e.target.checked)}
                          />
                          Oven checked
                        </label>
                        {oven.checked ? (
                          <div className="oven-sub">
                            <button
                              type="button"
                              className={`oven-opt${oven.outcome === "cleaned" ? " sel" : ""}`}
                              data-outcome="cleaned"
                              disabled={!canEditCleaning}
                              onClick={() => setOvenOutcome("cleaned")}
                            >
                              Cleaned
                            </button>
                            <button
                              type="button"
                              className={`oven-opt${oven.outcome === "attention" ? " sel" : ""}`}
                              data-outcome="attention"
                              disabled={!canEditCleaning}
                              onClick={() => setOvenOutcome("attention")}
                            >
                              Requires attention
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </details>
              );
            })}

            <h3 style={{ marginTop: 14 }}>Photos</h3>
            {photosLoading ? (
              <p className="photo-note">Loading photos…</p>
            ) : (
              <div className="photo-strip">
                {photos.map((p) => (
                  <div className="photo-thumb" key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs, not a static asset */}
                    <img
                      src={p.url}
                      alt=""
                      onMouseEnter={() => openLightboxOnHover(p)}
                      onMouseLeave={closeLightboxOnHoverEnd}
                      onClick={() => openLightboxPinned(p)}
                    />
                    {canEditCleaning ? (
                      <button
                        type="button"
                        className="rm"
                        onClick={() => handleRemovePhoto(p)}
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                ))}
                {canEditCleaning ? (
                  <button
                    type="button"
                    className="photo-add"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? "…" : "+"}
                  </button>
                ) : null}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {mode === "edit" && isStaffUser && booking?.assigned_cleaner_id && status === "complete" ? (
          <div className="clean-section">
            <h3>Rate this cleaning</h3>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn${n <= rating ? " sel" : ""}`}
                  onClick={() => {
                    setRating(n);
                    setRatingSaved(false);
                  }}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => {
                setRatingComment(e.target.value);
                setRatingSaved(false);
              }}
              placeholder="Optional note about this cleaning"
              style={{ marginTop: 10 }}
            />
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveRating}
                disabled={savingRating || rating < 1}
              >
                {savingRating ? "Saving…" : "Save rating"}
              </button>
              {ratingSaved ? <span style={{ fontSize: 12.5, color: "var(--teal-deep)" }}>Saved</span> : null}
            </div>
          </div>
        ) : null}

        {mode === "edit" && isStaffUser && booking?.assigned_cleaner_id && status === "complete" ? (
          <div className="clean-section">
            <h3>Cleaner payout</h3>
            {booking.payout_status === "paid" || justPaid ? (
              <p className="photo-note">Paid ✓</p>
            ) : !property?.payout_rate_cents ? (
              <p className="photo-note">No payout rate set for this property — set one on the Properties page.</p>
            ) : assignedCleaner?.stripe_connect_status !== "active" ? (
              <p className="photo-note">This cleaner hasn&apos;t finished setting up payouts yet.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePayCleaner}
                  disabled={payingCleaner}
                >
                  {payingCleaner
                    ? "Paying…"
                    : `Pay $${(
                        (property.payout_rate_cents +
                          (linenPickup ? (property.linen_box_count ?? 0) * (property.linen_fee_cents ?? 0) : 0)) /
                        100
                      ).toFixed(2)}`}
                </button>
              </div>
            )}
            {payError ? (
              <div className="error-banner" style={{ marginTop: 10 }}>
                {payError}
              </div>
            ) : null}
          </div>
        ) : null}

        {canSeeDispute ? (
          <div className="clean-section">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Dispute
              {booking?.dispute_status && booking.dispute_status !== "none" ? (
                <span className={`dispute-pill ${booking.dispute_status}`}>
                  {booking.dispute_status === "open" ? "Open" : "Resolved"}
                </span>
              ) : null}
            </h3>

            {disputeLoading ? (
              <p className="photo-note">Loading messages…</p>
            ) : (
              <div className="dispute-thread">
                {disputeMessages.length === 0 ? (
                  <p className="photo-note">No messages yet — post one to flag an issue.</p>
                ) : (
                  disputeMessages.map((m) => (
                    <div className="dispute-msg" key={m.id}>
                      <div className="dispute-msg-head">
                        <span className="dispute-msg-author">{m.author_name}</span>
                        <span className={`dispute-role-pill ${m.author_role}`}>{m.author_role}</span>
                        <span className="dispute-msg-time">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="dispute-msg-body">{m.body}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Describe the issue, or reply to the thread"
              style={{ marginTop: 10 }}
            />
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePostMessage}
                disabled={postingMessage || !newMessage.trim()}
              >
                {postingMessage ? "Posting…" : "Post"}
              </button>
              {isStaffUser && booking?.dispute_status === "open" ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResolveDispute}
                  disabled={resolving}
                >
                  {resolving ? "Resolving…" : "Mark resolved"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="modal-actions">
          {mode === "edit" && isStaffUser ? (
            <button type="button" className="btn btn-danger" disabled={saving} onClick={handleDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            {isUnclaimedOpenJob ? (
              <button type="button" className="btn btn-primary" disabled={claiming} onClick={handleClaim}>
                {claiming ? "Claiming…" : "Claim this job"}
              </button>
            ) : null}
            {isDeclinableAssigned ? (
              <button type="button" className="btn btn-secondary" disabled={claiming} onClick={handleDecline}>
                {claiming ? "Declining…" : "Decline job"}
              </button>
            ) : null}
            {isClaimedFromOpen ? (
              <button type="button" className="btn btn-secondary" disabled={claiming} onClick={handleRelease}>
                {claiming ? "Releasing…" : "Release job"}
              </button>
            ) : null}
            {canSave ? (
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {lightboxPhoto ? (
        <div
          className="photo-lightbox"
          onClick={closeLightbox}
          onMouseLeave={() => {
            if (!lightboxPinned) closeLightbox();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not a static asset */}
          <img src={lightboxPhoto.url} alt="" />
          {lightboxPinned ? (
            <button
              type="button"
              className="photo-lightbox-close"
              onClick={closeLightbox}
              aria-label="Close photo preview"
            >
              ✕
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
