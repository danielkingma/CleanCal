"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import {
  addPlatformListing,
  createPropertyOwner,
  deletePropertyOwner,
  removePlatformListing,
  savePropertyFinancials,
  updatePropertyOwner,
  type ClientInput,
} from "@/app/clients/actions";
import { dollarsToCents, formatCents } from "@/lib/money";
import { ALL_PLATFORM_BADGES, getPlatformBadge } from "@/lib/platform-badge";
import type { FeeBasis, PlatformListing, Property, PropertyFinancials, PropertyOwner } from "@/lib/types";

interface ClientsViewProps {
  owners: PropertyOwner[];
  properties: Property[];
  financials: PropertyFinancials[];
  listings: PlatformListing[];
  // Platforms each property has a calendar feed from (badge names).
  feedPlatforms: { property_id: string; platform: string }[];
  isSuperadmin?: boolean;
}

// Most-used first, then every other platform the calendar recognises.
const COMMON_PLATFORMS = ["Airbnb", "Booking.com", "Vrbo", "Stayz"];
const PLATFORM_CHOICES = [
  ...COMMON_PLATFORMS,
  ...ALL_PLATFORM_BADGES.map((b) => b.name).filter((n) => !COMMON_PLATFORMS.includes(n)),
  "Direct booking site",
  "Other",
];

function identifierHint(platform: string): string {
  if (platform === "Airbnb") return "Listing title from the earnings export";
  if (platform === "Booking.com") return "Property ID or property name";
  return "As shown in its payout report";
}

function PlatformDot({ platform }: { platform: string }) {
  const badge = getPlatformBadge(platform);
  if (!badge) return null;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 4px",
        borderRadius: 9,
        background: badge.color,
        color: "#fff",
        fontSize: 10.5,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {badge.code}
    </span>
  );
}

const EMPTY_CLIENT: ClientInput = { name: "", email: "", phone: "", notes: "" };

// Raw strings while editing (same reason as SuppliesView: coercing on
// every keystroke fights the user), parsed on save.
interface FeeDraft {
  property_owner_id: string;
  mgmt_fee_percent: string;
  fee_basis: FeeBasis;
  owner_cleaning_charge: string;
}

function draftFor(fin: PropertyFinancials | undefined): FeeDraft {
  return {
    property_owner_id: fin?.property_owner_id ?? "",
    mgmt_fee_percent: fin ? String(fin.mgmt_fee_percent) : "",
    fee_basis: fin?.fee_basis ?? "net_of_cleaning",
    owner_cleaning_charge:
      fin?.owner_cleaning_charge_cents === null || fin?.owner_cleaning_charge_cents === undefined
        ? ""
        : (fin.owner_cleaning_charge_cents / 100).toFixed(2),
  };
}

export default function ClientsView({
  owners,
  properties,
  financials,
  listings,
  feedPlatforms,
  isSuperadmin = false,
}: ClientsViewProps) {
  const finByProperty = useMemo(() => new Map(financials.map((f) => [f.property_id, f])), [financials]);
  const propertyCountByOwner = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of financials) {
      if (f.property_owner_id) counts.set(f.property_owner_id, (counts.get(f.property_owner_id) ?? 0) + 1);
    }
    return counts;
  }, [financials]);

  // ---- Clients ----
  const [newClient, setNewClient] = useState<ClientInput>(EMPTY_CLIENT);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClientInput>(EMPTY_CLIENT);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleCreateClient() {
    if (!newClient.name.trim()) return;
    setCreating(true);
    setClientError(null);
    try {
      await createPropertyOwner(newClient);
      setNewClient(EMPTY_CLIENT);
    } catch (e) {
      setClientError(e instanceof Error ? e.message : "Couldn't add that client.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveClient(id: string) {
    setBusyClientId(id);
    setClientError(null);
    try {
      await updatePropertyOwner(id, editDraft);
      setEditingId(null);
    } catch (e) {
      setClientError(e instanceof Error ? e.message : "Couldn't save that client.");
    } finally {
      setBusyClientId(null);
    }
  }

  async function handleDeleteClient(owner: PropertyOwner) {
    const count = propertyCountByOwner.get(owner.id) ?? 0;
    const warning = count > 0 ? ` Their ${count} ${count === 1 ? "property stays" : "properties stay"}, just unassigned.` : "";
    if (!window.confirm(`Remove ${owner.name}?${warning}`)) return;
    setBusyClientId(owner.id);
    setClientError(null);
    try {
      await deletePropertyOwner(owner.id);
    } catch (e) {
      setClientError(e instanceof Error ? e.message : "Couldn't remove that client.");
    } finally {
      setBusyClientId(null);
    }
  }

  // ---- Property fees ----
  const [drafts, setDrafts] = useState<Record<string, FeeDraft>>(() =>
    Object.fromEntries(properties.map((p) => [p.id, draftFor(finByProperty.get(p.id))])),
  );
  const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);
  const [feeErrors, setFeeErrors] = useState<Record<string, string>>({});

  function updateDraft(propertyId: string, patch: Partial<FeeDraft>) {
    // A property added since the page loaded has no draft yet.
    setDrafts((prev) => ({
      ...prev,
      [propertyId]: { ...(prev[propertyId] ?? draftFor(finByProperty.get(propertyId))), ...patch },
    }));
    if (savedPropertyId === propertyId) setSavedPropertyId(null);
  }

  async function handleSaveFees(propertyId: string) {
    const d = drafts[propertyId] ?? draftFor(finByProperty.get(propertyId));
    const fee = d.mgmt_fee_percent.trim() === "" ? 0 : Number(d.mgmt_fee_percent);
    const cleaning = dollarsToCents(d.owner_cleaning_charge);
    const problems: string[] = [];
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) problems.push("Fee must be 0–100%.");
    if (Number.isNaN(cleaning)) problems.push("Cleaning charge must be a dollar amount.");
    if (problems.length > 0) {
      setFeeErrors((prev) => ({ ...prev, [propertyId]: problems.join(" ") }));
      return;
    }
    setSavingPropertyId(propertyId);
    setFeeErrors((prev) => ({ ...prev, [propertyId]: "" }));
    try {
      await savePropertyFinancials(propertyId, {
        property_owner_id: d.property_owner_id || null,
        mgmt_fee_percent: fee,
        fee_basis: d.fee_basis,
        owner_cleaning_charge_cents: cleaning,
      });
      setSavedPropertyId(propertyId);
    } catch (e) {
      setFeeErrors((prev) => ({ ...prev, [propertyId]: e instanceof Error ? e.message : "Couldn't save." }));
    } finally {
      setSavingPropertyId(null);
    }
  }

  // ---- Platform listings ----
  const listingsByProperty = useMemo(() => {
    const map = new Map<string, PlatformListing[]>();
    for (const l of listings) map.set(l.property_id, [...(map.get(l.property_id) ?? []), l]);
    return map;
  }, [listings]);
  const feedPlatformsByProperty = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const f of feedPlatforms) map.set(f.property_id, [...(map.get(f.property_id) ?? []), f.platform]);
    return map;
  }, [feedPlatforms]);

  // Platforms the property is on (per its calendar feeds) with no listing
  // added yet -- the first one is pre-selected in the add form.
  function missingPlatforms(propertyId: string): string[] {
    const have = new Set((listingsByProperty.get(propertyId) ?? []).map((l) => l.platform.toLowerCase()));
    return (feedPlatformsByProperty.get(propertyId) ?? []).filter((pl) => !have.has(pl.toLowerCase()));
  }

  const [listingDrafts, setListingDrafts] = useState<Record<string, { platform: string; identifier: string }>>({});
  const [listingBusy, setListingBusy] = useState<string | null>(null);
  const [listingErrors, setListingErrors] = useState<Record<string, string>>({});

  function listingDraftFor(propertyId: string) {
    return listingDrafts[propertyId] ?? { platform: missingPlatforms(propertyId)[0] ?? "Airbnb", identifier: "" };
  }
  function updateListingDraft(propertyId: string, patch: Partial<{ platform: string; identifier: string }>) {
    setListingDrafts((prev) => ({ ...prev, [propertyId]: { ...listingDraftFor(propertyId), ...patch } }));
    setListingErrors((prev) => ({ ...prev, [propertyId]: "" }));
  }

  async function handleAddListing(propertyId: string) {
    const d = listingDraftFor(propertyId);
    if (!d.identifier.trim()) return;
    setListingBusy(propertyId);
    setListingErrors((prev) => ({ ...prev, [propertyId]: "" }));
    try {
      await addPlatformListing(propertyId, d.platform, d.identifier);
      // Clear the text and move on to the next platform still missing.
      setListingDrafts((prev) => {
        const next = { ...prev };
        delete next[propertyId];
        return next;
      });
    } catch (e) {
      setListingErrors((prev) => ({ ...prev, [propertyId]: e instanceof Error ? e.message : "Couldn't add that." }));
    } finally {
      setListingBusy(null);
    }
  }

  async function handleRemoveListing(listing: PlatformListing) {
    setListingBusy(listing.id);
    setListingErrors((prev) => ({ ...prev, [listing.property_id]: "" }));
    try {
      await removePlatformListing(listing.id);
    } catch (e) {
      setListingErrors((prev) => ({
        ...prev,
        [listing.property_id]: e instanceof Error ? e.message : "Couldn't remove that.",
      }));
    } finally {
      setListingBusy(null);
    }
  }

  const unassignedCount = properties.filter((p) => !finByProperty.get(p.id)?.property_owner_id).length;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <SignOutButton />
        </div>
        <div className="topbar-row">
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Clients &amp; fees</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser isSuperadmin={isSuperadmin} statementsEnabled />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <div className="info-banner" style={{ maxWidth: 760 }}>
          Clients are the owners of the properties you manage. Set each property&apos;s client and fees here, then
          import payouts on the <Link href="/payouts">Payouts</Link> page.
        </div>

        <div className="property-card" style={{ maxWidth: 760 }}>
          <h3 style={{ marginTop: 0 }}>Clients</h3>
          {clientError ? <div className="error-banner">{clientError}</div> : null}

          {owners.length === 0 ? <p className="access-note">No clients yet — add your first one below.</p> : null}
          {owners.length > 0 ? (
            <table className="feed-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Properties</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {owners.map((o) =>
                  editingId === o.id ? (
                    <tr key={o.id}>
                      <td>
                        <input
                          aria-label="Name"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Email"
                          type="email"
                          value={editDraft.email}
                          onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Phone"
                          value={editDraft.phone}
                          onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                        />
                      </td>
                      <td>{propertyCountByOwner.get(o.id) ?? 0}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busyClientId === o.id || !editDraft.name.trim()}
                          onClick={() => handleSaveClient(o.id)}
                        >
                          Save
                        </button>{" "}
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 500 }}>{o.name}</td>
                      <td>{o.email || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td>{o.phone || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td>{propertyCountByOwner.get(o.id) ?? 0}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyClientId === o.id}
                          onClick={() => {
                            setEditingId(o.id);
                            setEditDraft({ name: o.name, email: o.email, phone: o.phone, notes: o.notes });
                          }}
                        >
                          Edit
                        </button>{" "}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyClientId === o.id}
                          onClick={() => handleDeleteClient(o)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          ) : null}

          <h4 style={{ marginBottom: 8 }}>Add a client</h4>
          <div className="filter-row">
            <div className="field">
              <label htmlFor="clientName">Name</label>
              <input
                id="clientName"
                type="text"
                placeholder="e.g. Jane Smith"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="clientEmail">Email (statements go here)</label>
              <input
                id="clientEmail"
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="clientPhone">Phone</label>
              <input
                id="clientPhone"
                type="tel"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateClient}
            disabled={creating || !newClient.name.trim()}
          >
            {creating ? "Adding…" : "Add client"}
          </button>
        </div>

        <div className="property-card" style={{ maxWidth: 760, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            Property fees{unassignedCount > 0 ? ` — ${unassignedCount} without a client` : ""}
          </h3>
          <p className="access-note" style={{ marginTop: 0, marginBottom: 4 }}>
            Platform listings tell imported payouts which property they belong to, on any booking platform. Most
            payouts match on their confirmation code, so these only catch the rest — and they fill in automatically
            when you place a payout on the Payouts page.
          </p>
          {properties.length === 0 ? <p className="access-note">No properties yet.</p> : null}

          {properties.map((p) => {
            const d = drafts[p.id] ?? draftFor(finByProperty.get(p.id));
            const defaultCleaning = (p.payout_rate_cents ?? 0) > 0 ? formatCents(p.payout_rate_cents) : null;
            const propListings = listingsByProperty.get(p.id) ?? [];
            const missing = missingPlatforms(p.id);
            const ld = listingDraftFor(p.id);
            // A feed with the host's own label ("My website") is offered too.
            const platformOptions = [
              ...PLATFORM_CHOICES,
              ...(feedPlatformsByProperty.get(p.id) ?? []).filter((n) => !PLATFORM_CHOICES.includes(n)),
            ];
            return (
              <div key={p.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{p.name}</div>
                <div className="filter-row">
                  <div className="field">
                    <label htmlFor={`owner-${p.id}`}>Client</label>
                    <select
                      id={`owner-${p.id}`}
                      value={d.property_owner_id}
                      onChange={(e) => updateDraft(p.id, { property_owner_id: e.target.value })}
                    >
                      <option value="">— Not assigned —</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`fee-${p.id}`}>Management fee %</label>
                    <input
                      id={`fee-${p.id}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      placeholder="e.g. 20"
                      value={d.mgmt_fee_percent}
                      onChange={(e) => updateDraft(p.id, { mgmt_fee_percent: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`basis-${p.id}`}>Fee charged on</label>
                    <select
                      id={`basis-${p.id}`}
                      value={d.fee_basis}
                      onChange={(e) => updateDraft(p.id, { fee_basis: e.target.value as FeeBasis })}
                    >
                      <option value="net_of_cleaning">After cleaning</option>
                      <option value="gross">Full payout</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`clean-${p.id}`}>Cleaning charged to owner ($)</label>
                    <input
                      id={`clean-${p.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder={defaultCleaning ?? "e.g. 120"}
                      value={d.owner_cleaning_charge}
                      onChange={(e) => updateDraft(p.id, { owner_cleaning_charge: e.target.value })}
                    />
                  </div>
                </div>
                {feeErrors[p.id] ? (
                  <div className="error-banner" style={{ marginTop: 12 }}>
                    {feeErrors[p.id]}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingPropertyId === p.id}
                    onClick={() => handleSaveFees(p.id)}
                  >
                    {savingPropertyId === p.id ? "Saving…" : "Save fees"}
                  </button>
                  {savedPropertyId === p.id ? (
                    <span style={{ color: "var(--teal)", fontSize: 13 }}>Saved</span>
                  ) : null}
                  {d.owner_cleaning_charge.trim() === "" ? (
                    <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
                      Blank cleaning charge = the cleaner rate{p.linen_fee_cents ? ", plus linen when picked up" : ""}.
                    </span>
                  ) : null}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                    Platform listings
                  </div>
                  {propListings.length === 0 && missing.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>None yet.</div>
                  ) : null}
                  {propListings.length > 0 || missing.length > 0 ? (
                    <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      {propListings.map((l) => (
                        <li key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                          <PlatformDot platform={l.platform} />
                          <span style={{ color: "var(--muted)", minWidth: 100 }}>{l.platform}</span>
                          <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{l.identifier}</span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: 12.5 }}
                            disabled={listingBusy === l.id}
                            onClick={() => handleRemoveListing(l)}
                            aria-label={`Remove ${l.platform} listing ${l.identifier}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                      {missing.map((platform) => (
                        <li key={`missing-${platform}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <PlatformDot platform={platform} />
                          <span style={{ color: "var(--muted)" }}>
                            On {platform} (from its calendar feed) — no listing added yet
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="filter-row">
                    <div className="field" style={{ flex: "1 1 160px", maxWidth: 220 }}>
                      <label htmlFor={`lp-${p.id}`}>Platform</label>
                      <select
                        id={`lp-${p.id}`}
                        value={ld.platform}
                        onChange={(e) => updateListingDraft(p.id, { platform: e.target.value })}
                      >
                        {platformOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ flex: "1 1 240px" }}>
                      <label htmlFor={`li-${p.id}`}>Listing name or ID</label>
                      <input
                        id={`li-${p.id}`}
                        type="text"
                        placeholder={identifierHint(ld.platform)}
                        value={ld.identifier}
                        onChange={(e) => updateListingDraft(p.id, { identifier: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddListing(p.id);
                        }}
                      />
                    </div>
                    <div className="field" style={{ flex: "0 0 auto", minWidth: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={listingBusy === p.id || !ld.identifier.trim()}
                        onClick={() => handleAddListing(p.id)}
                      >
                        {listingBusy === p.id ? "Adding…" : "Add listing"}
                      </button>
                    </div>
                  </div>
                  {listingErrors[p.id] ? (
                    <div className="error-banner" style={{ marginTop: 8, marginBottom: 0 }}>
                      {listingErrors[p.id]}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
