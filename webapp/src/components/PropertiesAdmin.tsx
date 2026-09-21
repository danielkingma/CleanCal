"use client";

import { useState } from "react";
import Link from "next/link";
import {
  addIcalFeed,
  createProperty,
  deleteIcalFeed,
  deleteProperty,
  syncAllFeeds,
  syncIcalFeed,
  updateAccessInstructions,
} from "@/app/properties/actions";
import Logo from "./Logo";
import type { IcalFeed, Property } from "@/lib/types";

interface PropertiesAdminProps {
  properties: Property[];
  feeds: IcalFeed[];
  isOwner: boolean;
}

export default function PropertiesAdmin({ properties, feeds, isOwner }: PropertiesAdminProps) {
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllMessage, setSyncAllMessage] = useState<string | null>(null);

  const [newPropertyName, setNewPropertyName] = useState("");
  const [addingProperty, setAddingProperty] = useState(false);
  const [addPropertyError, setAddPropertyError] = useState<string | null>(null);

  async function handleAddProperty() {
    setAddPropertyError(null);
    setAddingProperty(true);
    try {
      await createProperty(newPropertyName);
      setNewPropertyName("");
    } catch (e) {
      setAddPropertyError(e instanceof Error ? e.message : "Couldn't add property.");
    } finally {
      setAddingProperty(false);
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    setSyncAllMessage(null);
    try {
      const result = await syncAllFeeds();
      setSyncAllMessage(
        result.failed > 0
          ? `Synced ${result.synced - result.failed}/${result.synced} feeds — ${result.failed} failed, see errors below.`
          : `Synced ${result.synced} feed${result.synced === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      setSyncAllMessage(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Properties</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {syncAllMessage ? (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{syncAllMessage}</span>
          ) : null}
          <button className="today-btn" onClick={handleSyncAll} disabled={syncingAll}>
            {syncingAll ? "Syncing…" : "Sync all feeds"}
          </button>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
        </div>
      </div>

      <main>
        <div className="property-card">
          <label htmlFor="newPropertyName" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            Add a property
          </label>
          <div className="add-feed-row" style={{ marginTop: 8 }}>
            <input
              id="newPropertyName"
              type="text"
              placeholder="Property name"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddProperty}
              disabled={addingProperty}
            >
              {addingProperty ? "Adding…" : "Add property"}
            </button>
          </div>
          {addPropertyError ? (
            <div className="error-banner" style={{ marginTop: 10 }}>
              {addPropertyError}
            </div>
          ) : null}
        </div>

        {properties.length === 0 ? (
          <p className="photo-note" style={{ maxWidth: 760 }}>
            No properties yet — add one above to start building your calendar.
          </p>
        ) : null}

        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            feeds={feeds.filter((f) => f.property_id === property.id)}
            isOwner={isOwner}
          />
        ))}
      </main>
    </div>
  );
}

function PropertyCard({
  property,
  feeds,
  isOwner,
}: {
  property: Property;
  feeds: IcalFeed[];
  isOwner: boolean;
}) {
  const [instructions, setInstructions] = useState(property.access_instructions ?? "");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [deletingFeedId, setDeletingFeedId] = useState<string | null>(null);
  const [deletingProperty, setDeletingProperty] = useState(false);
  const [deletePropertyError, setDeletePropertyError] = useState<string | null>(null);

  async function handleDeleteProperty() {
    const confirmed = window.confirm(
      `Delete "${property.name}"? This also permanently deletes every booking, photo, and calendar feed on this property. This can't be undone.`,
    );
    if (!confirmed) return;
    setDeletePropertyError(null);
    setDeletingProperty(true);
    try {
      await deleteProperty(property.id);
    } catch (e) {
      setDeletePropertyError(e instanceof Error ? e.message : "Couldn't delete property.");
      setDeletingProperty(false);
    }
  }

  async function handleSaveInstructions() {
    setSavingInstructions(true);
    setInstructionsSaved(false);
    try {
      await updateAccessInstructions(property.id, instructions);
      setInstructionsSaved(true);
    } finally {
      setSavingInstructions(false);
    }
  }

  async function handleAddFeed() {
    setAddError(null);
    setAdding(true);
    try {
      await addIcalFeed(property.id, label, url);
      setLabel("");
      setUrl("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Couldn't add feed.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSyncFeed(feedId: string) {
    setSyncingFeedId(feedId);
    try {
      await syncIcalFeed(feedId);
    } catch {
      // surfaced via last_sync_error on the feed row once the page re-renders
    } finally {
      setSyncingFeedId(null);
    }
  }

  async function handleDeleteFeed(feedId: string) {
    setDeletingFeedId(feedId);
    try {
      await deleteIcalFeed(feedId);
    } finally {
      setDeletingFeedId(null);
    }
  }

  return (
    <div className="property-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{property.name}</h2>
        {isOwner ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeleteProperty}
            disabled={deletingProperty}
          >
            {deletingProperty ? "Deleting…" : "Delete property"}
          </button>
        ) : null}
      </div>
      {deletePropertyError ? <div className="error-banner">{deletePropertyError}</div> : null}

      <div className="field">
        <label htmlFor={`instr-${property.id}`}>
          Access instructions (visible to cleaners on this property&apos;s bookings)
        </label>
        <textarea
          id={`instr-${property.id}`}
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            setInstructionsSaved(false);
          }}
          placeholder="Door code, parking, wifi — anything a cleaner needs to get in and get started"
        />
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSaveInstructions}
            disabled={savingInstructions}
          >
            {savingInstructions ? "Saving…" : "Save"}
          </button>
          {instructionsSaved ? (
            <span style={{ fontSize: 12.5, color: "var(--teal-deep)" }}>Saved</span>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label>
          Calendar feeds — Airbnb, Vrbo, Booking.com, or a direct-booking site, any iCal export URL
        </label>
        {feeds.length === 0 ? (
          <p className="photo-note">No feeds yet — bookings here are entered manually.</p>
        ) : (
          <table className="feed-table">
            <tbody>
              {feeds.map((feed) => (
                <tr key={feed.id}>
                  <td>{feed.source_label}</td>
                  <td className="feed-url" title={feed.ical_url}>
                    {feed.ical_url}
                  </td>
                  <td>
                    <span className={`sync-pill ${feed.last_sync_status}`}>
                      {feed.last_sync_status === "never"
                        ? "Never synced"
                        : feed.last_sync_status === "ok"
                          ? "OK"
                          : "Error"}
                    </span>
                    {feed.last_sync_error ? (
                      <div className="sync-error" title={feed.last_sync_error}>
                        {feed.last_sync_error}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleSyncFeed(feed.id)}
                      disabled={syncingFeedId === feed.id}
                    >
                      {syncingFeedId === feed.id ? "Syncing…" : "Sync now"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeleteFeed(feed.id)}
                      disabled={deletingFeedId === feed.id}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="add-feed-row">
          <input
            type="text"
            placeholder="Label (e.g. Airbnb, or My website)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="url"
            placeholder="https://... .ics calendar link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={handleAddFeed} disabled={adding}>
            {adding ? "Adding…" : "Add feed"}
          </button>
        </div>
        {addError ? <div className="error-banner">{addError}</div> : null}
      </div>
    </div>
  );
}
