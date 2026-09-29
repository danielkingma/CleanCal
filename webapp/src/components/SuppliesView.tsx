"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import { createSupplyItem, deleteSupplyItem, reportSupplyUsage, restockSupplyItem } from "@/app/supplies/actions";
import type { Property, SupplyItem } from "@/lib/types";

interface SuppliesViewProps {
  isStaffUser: boolean;
  items: SupplyItem[];
  properties: Property[];
}

export default function SuppliesView({ isStaffUser, items, properties }: SuppliesViewProps) {
  const propertyNameById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p.name])), [properties]);

  // New item form (staff only)
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [quantity, setQuantity] = useState(10);
  const [lowThreshold, setLowThreshold] = useState(2);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // A restock is a quick inline "set it back to N" input, kept per-row so
  // more than one item's field can be open without clobbering the others.
  const [restockValues, setRestockValues] = useState<Record<string, string>>({});

  async function handleCreate() {
    if (!propertyId || !name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createSupplyItem({
        property_id: propertyId,
        name: name.trim(),
        unit: unit.trim() || "unit",
        quantity,
        low_threshold: lowThreshold,
      });
      setName("");
      setQuantity(10);
      setLowThreshold(2);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Couldn't add that item.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUseOne(item: SupplyItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      await reportSupplyUsage(item.id, 1);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't report that.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestock(item: SupplyItem) {
    const raw = restockValues[item.id];
    const value = Number(raw);
    if (!raw || Number.isNaN(value) || value < 0) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      await restockSupplyItem(item.id, value);
      setRestockValues((prev) => ({ ...prev, [item.id]: "" }));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't restock that item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this item from the supply list?")) return;
    setBusyId(id);
    setActionError(null);
    try {
      await deleteSupplyItem(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't remove that item.");
    } finally {
      setBusyId(null);
    }
  }

  const itemsByProperty = useMemo(() => {
    const map = new Map<string, SupplyItem[]>();
    for (const item of items) {
      const list = map.get(item.property_id) ?? [];
      list.push(item);
      map.set(item.property_id, list);
    }
    return map;
  }, [items]);

  const lowCount = items.filter((i) => i.quantity <= i.low_threshold).length;

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
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Supplies</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={isStaffUser} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        {actionError ? <div className="error-banner" style={{ maxWidth: 640 }}>{actionError}</div> : null}

        {isStaffUser ? (
          <div className="property-card" style={{ maxWidth: 640 }}>
            <h3 style={{ marginTop: 0 }}>Add a supply item</h3>
            <div className="filter-row">
              <div className="field">
                <label htmlFor="supProperty">Property</label>
                <select id="supProperty" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="supUnit">Unit</label>
                <input
                  id="supUnit"
                  type="text"
                  placeholder="rolls, bottles, bags…"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="supName">Item</label>
              <input
                id="supName"
                type="text"
                placeholder="e.g. Toilet paper"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="filter-row">
              <div className="field">
                <label htmlFor="supQty">Starting quantity</label>
                <input
                  id="supQty"
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                />
              </div>
              <div className="field">
                <label htmlFor="supThreshold">Flag as low at or below</label>
                <input
                  id="supThreshold"
                  type="number"
                  min={0}
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            {createError ? <div className="error-banner">{createError}</div> : null}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !propertyId || !name.trim()}
            >
              {creating ? "Adding…" : "Add item"}
            </button>
          </div>
        ) : null}

        <div className="property-card" style={{ maxWidth: 640, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            Supply list{lowCount > 0 ? ` — ${lowCount} running low` : ""}
          </h3>
          {items.length === 0 ? (
            <p className="access-note">
              {isStaffUser ? "Nothing tracked yet — add an item above." : "Nothing tracked yet."}
            </p>
          ) : null}
          {Array.from(itemsByProperty.entries()).map(([propId, propItems]) => (
            <div key={propId} style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
                {propertyNameById[propId] ?? "Property"}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {propItems.map((item) => {
                  const low = item.quantity <= item.low_threshold;
                  return (
                    <li
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                        borderTop: "1px solid var(--line)",
                        paddingTop: 8,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 500 }}>{item.name}</span>{" "}
                        <span style={{ fontSize: 12.5, color: low ? "var(--coral)" : "var(--muted)", fontWeight: low ? 600 : 400 }}>
                          {item.quantity} {item.unit}
                          {low ? " — low" : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyId === item.id || item.quantity === 0}
                          onClick={() => handleUseOne(item)}
                        >
                          Used one
                        </button>
                        {isStaffUser ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              placeholder="Restock to…"
                              style={{ width: 90 }}
                              value={restockValues[item.id] ?? ""}
                              onChange={(e) => setRestockValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={busyId === item.id || !restockValues[item.id]}
                              onClick={() => handleRestock(item)}
                            >
                              Restock
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={busyId === item.id}
                              onClick={() => handleDelete(item.id)}
                            >
                              Remove
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
