"use client";

import { useEffect, useRef, useState } from "react";
import {
  createBooking,
  deleteBooking,
  updateBookingAdmin,
  updateBookingCleaner,
  type BookingInput,
} from "@/app/calendar/actions";
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST_ITEMS, addDays, daysBetween, fromISO, isoDate } from "@/lib/calendar-utils";
import { getPlatformBadge } from "@/lib/platform-badge";
import type { Booking, BookingStatus, Checklist, Profile, Property, Role } from "@/lib/types";

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
  booking,
  presetPropertyId,
  presetDate,
  onClose,
  onDone,
}: BookingModalProps) {
  const isAdmin = role === "admin";
  const isAssignedCleaner = role === "cleaner" && !!booking && booking.assigned_cleaner_id === currentUserId;
  const canEditCore = isAdmin;
  const canEditCleaning = isAdmin || isAssignedCleaner;
  const canSave = mode === "new" ? isAdmin : canEditCleaning;

  const [propertyId, setPropertyId] = useState(
    booking?.property_id ?? presetPropertyId ?? properties[0]?.id ?? "",
  );
  const [checkinDate, setCheckinDate] = useState(booking?.checkin_date ?? presetDate ?? isoDate(new Date()));
  const [nights, setNights] = useState(booking?.nights ?? 2);
  const [checkoutStr, setCheckoutStr] = useState(() =>
    isoDate(addDays(fromISO(booking?.checkin_date ?? presetDate ?? isoDate(new Date())), booking?.nights ?? 2)),
  );
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? "to-clean");
  const [checklist, setChecklist] = useState<Checklist>(
    () => booking?.checklist ?? { oven: { checked: false, outcome: null } },
  );
  const [assignedCleanerId, setAssignedCleanerId] = useState<string | null>(
    booking?.assigned_cleaner_id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(mode === "edit");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (isAdmin) {
        const input: BookingInput = {
          property_id: propertyId,
          checkin_date: checkinDate,
          nights,
          status,
          notes,
          checklist,
          assigned_cleaner_id: assignedCleanerId,
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
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const platform = getPlatformBadge(booking?.platform_label);

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
        {mode === "edit" && role === "cleaner" && !isAssignedCleaner ? (
          <div className="error-banner">This booking isn&apos;t assigned to you — view only.</div>
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

        {isAdmin ? (
          <div className="field">
            <label htmlFor="fCleaner">Assigned cleaner</label>
            <select
              id="fCleaner"
              value={assignedCleanerId ?? ""}
              onChange={(e) => setAssignedCleanerId(e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
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
          <div className="clean-section">
            <h3>Cleaning checklist</h3>
            <div>
              {CHECKLIST_ITEMS.map((item) => (
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
            </div>
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

            <h3 style={{ marginTop: 14 }}>Photos</h3>
            {photosLoading ? (
              <p className="photo-note">Loading photos…</p>
            ) : (
              <div className="photo-strip">
                {photos.map((p) => (
                  <div className="photo-thumb" key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs, not a static asset */}
                    <img src={p.url} alt="" />
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

        <div className="modal-actions">
          {mode === "edit" && isAdmin ? (
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
            {canSave ? (
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
