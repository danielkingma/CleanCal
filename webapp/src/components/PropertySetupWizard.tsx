"use client";

import { useState } from "react";
import { addIcalFeed, createProperty, updatePropertyProfile } from "@/app/properties/actions";
import { buildChecklistSections } from "@/lib/calendar-utils";
import Logo from "./Logo";

// A short, deterministic guided flow for the very first property a brand-new
// Owner adds -- replaces handing them a blank "Properties" admin page (name
// field, then a wall of separate room-count/linen/calendar-feed controls
// they'd have no reason yet to understand the point of). It doesn't invent
// any new data: every field here maps straight onto the same columns
// PropertiesAdmin.tsx already edits (bedroom_count/bathroom_count/
// has_outdoor_area via updatePropertyProfile, ical_feeds via addIcalFeed).
// The one new idea is `propertyType`, which only ever picks sensible
// starting values for those existing fields -- it's never itself persisted,
// so there's no new schema and nothing to migrate if the list of types ever
// changes.
//
// Only shown on the "create a new business" branch of onboarding (see
// OnboardingForm.tsx) -- someone joining an existing business via invite is
// joining a property set-up that already exists, so there's nothing for
// this wizard to do for them.

type PropertyType = "house" | "apartment" | "cabin" | "other";

const TYPE_OPTIONS: { value: PropertyType; label: string; blurb: string }[] = [
  { value: "house", label: "House", blurb: "3 bed · 2 bath · outdoor area" },
  { value: "apartment", label: "Apartment / unit", blurb: "1 bed · 1 bath · no outdoor area" },
  { value: "cabin", label: "Cabin / cottage", blurb: "2 bed · 1 bath · outdoor area" },
  { value: "other", label: "Not sure / other", blurb: "You can fine-tune this next" },
];

// Only used to pre-fill the room-count step below -- a host who picks
// "House" still sees plain number inputs afterward and can change anything
// before it's saved. Deliberately close to buildChecklistSections()'s own
// silent 1-bed/1-bath fallback for "other", so picking it isn't a trap.
const TYPE_DEFAULTS: Record<PropertyType, { bedrooms: number; bathrooms: number; outdoor: boolean }> = {
  house: { bedrooms: 3, bathrooms: 2, outdoor: true },
  apartment: { bedrooms: 1, bathrooms: 1, outdoor: false },
  cabin: { bedrooms: 2, bathrooms: 1, outdoor: true },
  other: { bedrooms: 1, bathrooms: 1, outdoor: false },
};

// Labels a host can tap instead of typing their own -- getPlatformBadge()
// (platform-badge.ts) matches any of these by a loose regex already, so
// using the exact word here is just a convenience, not a requirement; the
// field stays a free-text input for anything not listed (a local real
// estate site's own booking calendar, for instance).
const PLATFORM_CHIPS = ["Airbnb", "Vrbo", "Booking.com", "Direct bookings"];

type Step = "name" | "rooms" | "checklist" | "calendar";
const STEPS: Step[] = ["name", "rooms", "checklist", "calendar"];

interface AddedFeed {
  label: string;
  url: string;
}

export default function PropertySetupWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("name");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);

  const [bedroomCount, setBedroomCount] = useState(1);
  const [bathroomCount, setBathroomCount] = useState(1);
  const [hasOutdoorArea, setHasOutdoorArea] = useState(false);

  const [feedLabel, setFeedLabel] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [addedFeeds, setAddedFeeds] = useState<AddedFeed[]>([]);

  function selectType(type: PropertyType) {
    setPropertyType(type);
    const d = TYPE_DEFAULTS[type];
    setBedroomCount(d.bedrooms);
    setBathroomCount(d.bathrooms);
    setHasOutdoorArea(d.outdoor);
  }

  async function handleCreateProperty() {
    if (!propertyName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createProperty(propertyName);
      setPropertyId(id);
      setStep("rooms");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that property.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRooms() {
    if (!propertyId) return;
    setSaving(true);
    setError(null);
    try {
      await updatePropertyProfile(propertyId, bedroomCount, bathroomCount, hasOutdoorArea);
      setStep("checklist");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save those details.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFeed() {
    if (!propertyId || !feedLabel.trim() || !feedUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addIcalFeed(propertyId, feedLabel, feedUrl);
      setAddedFeeds((prev) => [...prev, { label: feedLabel.trim(), url: feedUrl.trim() }]);
      setFeedLabel("");
      setFeedUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that calendar link.");
    } finally {
      setSaving(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>

        <div className="wizard-progress" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= stepIndex ? "active" : ""} />
          ))}
        </div>

        {step === "name" ? (
          <>
            <p className="auth-sub">Let&apos;s add your first property, so your calendar isn&apos;t empty.</p>
            <div className="auth-form">
              <div className="field">
                <label htmlFor="propertyName">Property name</label>
                <input
                  id="propertyName"
                  type="text"
                  required
                  placeholder="e.g. 12 Marine Parade"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>What kind of place is it?</label>
                <div className="wizard-type-grid">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`wizard-type-chip${propertyType === opt.value ? " sel" : ""}`}
                      onClick={() => selectType(opt.value)}
                    >
                      {opt.label}
                      <br />
                      <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--muted)" }}>{opt.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={handleCreateProperty}
              disabled={saving || !propertyName.trim() || !propertyType}
            >
              {saving ? "Saving…" : "Continue"}
            </button>
            <p className="auth-sub" style={{ marginTop: 10, fontSize: 13, textAlign: "center" }}>
              <button
                type="button"
                onClick={onDone}
                disabled={saving}
                style={{ background: "none", border: "none", padding: 0, color: "var(--muted)", textDecoration: "underline", font: "inherit", cursor: "pointer" }}
              >
                I&apos;ll set up my first property later
              </button>
            </p>
          </>
        ) : null}

        {step === "rooms" ? (
          <>
            <p className="auth-sub">
              This is what scales your cleaning checklist to {propertyName || "this property"} — one Bedroom and
              Bathroom section per room, so nothing gets skipped or double-counted.
            </p>
            <div className="auth-form">
              <div className="two-col">
                <div className="field">
                  <label htmlFor="bedroomCount">Bedrooms</label>
                  <input
                    id="bedroomCount"
                    type="number"
                    min={1}
                    value={bedroomCount}
                    onChange={(e) => setBedroomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="bathroomCount">Bathrooms</label>
                  <input
                    id="bathroomCount"
                    type="number"
                    min={1}
                    value={bathroomCount}
                    onChange={(e) => setBathroomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              </div>
              <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="hasOutdoorArea"
                  type="checkbox"
                  checked={hasOutdoorArea}
                  onChange={(e) => setHasOutdoorArea(e.target.checked)}
                />
                <label htmlFor="hasOutdoorArea" style={{ margin: 0 }}>
                  Has an outdoor area (balcony, yard, courtyard)
                </label>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={handleSaveRooms}
              disabled={saving}
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </>
        ) : null}

        {step === "checklist" ? (
          <>
            <p className="auth-sub">
              Here&apos;s the cleaning checklist your cleaners will see after every stay at {propertyName || "this property"}.
              It&apos;s built from the room counts you just entered — add more rooms later and it updates on its own.
            </p>
            <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 16 }}>
              {buildChecklistSections({
                bedroom_count: bedroomCount,
                bathroom_count: bathroomCount,
                has_outdoor_area: hasOutdoorArea,
              }).map((sec) => (
                <details className="checklist-section" key={sec.section}>
                  <summary>
                    <span>{sec.section}</span>
                    <span className="checklist-count">{sec.items.length} items</span>
                  </summary>
                  <div className="checklist-section-body">
                    {sec.items.map((item) => (
                      <label className="checklist-item" key={item.key}>
                        <input type="checkbox" disabled checked={false} readOnly />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setStep("calendar")}
            >
              Looks good, continue
            </button>
          </>
        ) : null}

        {step === "calendar" ? (
          <>
            <p className="auth-sub">
              If this property is already listed on Airbnb, Vrbo, Booking.com or anywhere else, add its calendar
              link so bookings flow straight into CleanCal. On that site, find its calendar export link — usually
              under Calendar → Export or Sync.
            </p>
            {addedFeeds.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                {addedFeeds.map((f, i) => (
                  <div className="wizard-feed-added" key={`${f.label}-${i}`}>
                    <span>{f.label}</span>
                    <span style={{ color: "var(--teal-deep)", fontWeight: 600 }}>Added ✓</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="auth-form">
              <div className="field">
                <label>Platform</label>
                <div className="wizard-platform-row">
                  {PLATFORM_CHIPS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`wizard-platform-chip${feedLabel === p ? " sel" : ""}`}
                      onClick={() => setFeedLabel(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or type a label, e.g. a local real estate site"
                  value={feedLabel}
                  onChange={(e) => setFeedLabel(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="feedUrl">Calendar (iCal) link</label>
                <input
                  id="feedUrl"
                  type="url"
                  placeholder="https://…"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", marginBottom: 10 }}
              onClick={handleAddFeed}
              disabled={saving || !feedLabel.trim() || !feedUrl.trim()}
            >
              {saving ? "Adding…" : "Add this calendar link"}
            </button>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={onDone}>
              {addedFeeds.length > 0 ? "Finish setup" : "Skip for now, finish setup"}
            </button>
          </>
        ) : null}

        {error ? (
          <p className="auth-error">
            {error} Still stuck? Email <a href="mailto:support@cleancal.net">support@cleancal.net</a>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
