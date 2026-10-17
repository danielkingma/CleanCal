"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import {
  createPropertyOwner,
  deletePropertyOwner,
  savePropertyFinancials,
  updatePropertyOwner,
  type ClientInput,
} from "@/app/clients/actions";
import { dollarsToCents, formatCents } from "@/lib/money";
import type { FeeBasis, Property, PropertyFinancials, PropertyOwner } from "@/lib/types";

interface ClientsViewProps {
  owners: PropertyOwner[];
  properties: Property[];
  financials: PropertyFinancials[];
  isSuperadmin?: boolean;
}

const EMPTY_CLIENT: ClientInput = { name: "", email: "", phone: "", notes: "" };

// Raw strings while editing (same reason as SuppliesView: coercing on
// every keystroke fights the user), parsed on save.
interface FeeDraft {
  property_owner_id: string;
  mgmt_fee_percent: string;
  fee_basis: FeeBasis;
  owner_cleaning_charge: string;
  airbnb_listing_name: string;
  booking_com_property_id: string;
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
    airbnb_listing_name: fin?.airbnb_listing_name ?? "",
    booking_com_property_id: fin?.booking_com_property_id ?? "",
  };
}

export default function ClientsView({ owners, properties, financials, isSuperadmin = false }: ClientsViewProps) {
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
        airbnb_listing_name: d.airbnb_listing_name,
        booking_com_property_id: d.booking_com_property_id,
      });
      setSavedPropertyId(propertyId);
    } catch (e) {
      setFeeErrors((prev) => ({ ...prev, [propertyId]: e instanceof Error ? e.message : "Couldn't save." }));
    } finally {
      setSavingPropertyId(null);
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
          <p className="access-note" style={{ marginTop: 0 }}>
            Listing names and Booking.com IDs let imported payouts find the right property. Copy them exactly as they
            appear in each platform&apos;s export.
          </p>
          {properties.length === 0 ? <p className="access-note">No properties yet.</p> : null}

          {properties.map((p) => {
            const d = drafts[p.id] ?? draftFor(finByProperty.get(p.id));
            const defaultCleaning = (p.payout_rate_cents ?? 0) > 0 ? formatCents(p.payout_rate_cents) : null;
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
                      <option value="net_of_cleaning">Payout after cleaning</option>
                      <option value="gross">Full payout</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`clean-${p.id}`}>Cleaning charged to owner ($)</label>
                    <input
                      id={`clean-${p.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder={defaultCleaning ? `Cleaner rate: ${defaultCleaning}` : "e.g. 120"}
                      value={d.owner_cleaning_charge}
                      onChange={(e) => updateDraft(p.id, { owner_cleaning_charge: e.target.value })}
                    />
                  </div>
                </div>
                <div className="filter-row">
                  <div className="field" style={{ flex: 2 }}>
                    <label htmlFor={`airbnb-${p.id}`}>Airbnb listing name</label>
                    <input
                      id={`airbnb-${p.id}`}
                      type="text"
                      placeholder="As shown in the Airbnb export"
                      value={d.airbnb_listing_name}
                      onChange={(e) => updateDraft(p.id, { airbnb_listing_name: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`bk-${p.id}`}>Booking.com property ID</label>
                    <input
                      id={`bk-${p.id}`}
                      type="text"
                      value={d.booking_com_property_id}
                      onChange={(e) => updateDraft(p.id, { booking_com_property_id: e.target.value })}
                    />
                  </div>
                </div>
                {feeErrors[p.id] ? <div className="error-banner">{feeErrors[p.id]}</div> : null}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingPropertyId === p.id}
                    onClick={() => handleSaveFees(p.id)}
                  >
                    {savingPropertyId === p.id ? "Saving…" : "Save"}
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
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
