"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import {
  createMaintenanceSchedule,
  createWorkOrder,
  createWorkOrderFromSchedule,
  deleteMaintenanceSchedule,
  deleteWorkOrder,
  markScheduleCompletedNow,
  updateOwnWorkOrderStatus,
  updateWorkOrder,
  type WorkOrderInput,
} from "@/app/maintenance/actions";
import type { MaintenanceSchedule, Profile, Property, WorkOrder, WorkOrderStatus } from "@/lib/types";

interface MaintenanceViewProps {
  isStaffUser: boolean;
  workOrders: WorkOrder[];
  schedules: MaintenanceSchedule[];
  properties: Property[];
  cleaners: Profile[];
  isSuperadmin?: boolean;
}

const SOURCE_LABEL: Record<WorkOrder["source"], string> = {
  manual: "Manual",
  low_rating: "Low rating",
  preventative: "Preventative",
};

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  done: "Done",
};

function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export default function MaintenanceView({
  isStaffUser,
  workOrders,
  schedules,
  properties,
  cleaners,
  isSuperadmin = false,
}: MaintenanceViewProps) {
  const propertyNameById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p.name])), [properties]);
  const cleanerNameById = useMemo(() => Object.fromEntries(cleaners.map((c) => [c.id, c.name])), [cleaners]);
  const cleanerColorById = useMemo(
    () => Object.fromEntries(cleaners.filter((c) => c.favorite_color).map((c) => [c.id, c.favorite_color as string])),
    [cleaners],
  );

  // New work order form
  const [woPropertyId, setWoPropertyId] = useState(properties[0]?.id ?? "");
  const [woTitle, setWoTitle] = useState("");
  const [woDescription, setWoDescription] = useState("");
  const [woPriority, setWoPriority] = useState<"normal" | "urgent">("normal");
  const [woAssignedTo, setWoAssignedTo] = useState("");
  const [woDueDate, setWoDueDate] = useState("");
  const [creatingWo, setCreatingWo] = useState(false);
  const [woError, setWoError] = useState<string | null>(null);

  // New schedule form
  const [schedPropertyId, setSchedPropertyId] = useState(properties[0]?.id ?? "");
  const [schedTitle, setSchedTitle] = useState("");
  // A raw string, not a number -- see SuppliesView.tsx's quantity/
  // lowThreshold fields for why: coercing on every keystroke
  // (Number(e.target.value) || 90) snaps the field back to a non-empty
  // value the instant it's cleared to type something else, which reads
  // as the field being stuck or doubling digits.
  const [schedIntervalDays, setSchedIntervalDays] = useState("90");
  const [creatingSched, setCreatingSched] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreateWorkOrder() {
    if (!woPropertyId || !woTitle.trim()) return;
    setCreatingWo(true);
    setWoError(null);
    try {
      const input: WorkOrderInput = {
        property_id: woPropertyId,
        title: woTitle.trim(),
        description: woDescription.trim(),
        priority: woPriority,
        assigned_to: woAssignedTo || null,
        due_date: woDueDate || null,
      };
      await createWorkOrder(input);
      setWoTitle("");
      setWoDescription("");
      setWoPriority("normal");
      setWoAssignedTo("");
      setWoDueDate("");
    } catch (e) {
      setWoError(e instanceof Error ? e.message : "Couldn't create the work order.");
    } finally {
      setCreatingWo(false);
    }
  }

  const schedIntervalDaysNum = Number(schedIntervalDays) || 0;

  async function handleCreateSchedule() {
    if (!schedPropertyId || !schedTitle.trim() || schedIntervalDaysNum < 1) return;
    setCreatingSched(true);
    setSchedError(null);
    try {
      await createMaintenanceSchedule({
        property_id: schedPropertyId,
        title: schedTitle.trim(),
        interval_days: schedIntervalDaysNum,
      });
      setSchedTitle("");
      setSchedIntervalDays("90");
    } catch (e) {
      setSchedError(e instanceof Error ? e.message : "Couldn't create the schedule.");
    } finally {
      setCreatingSched(false);
    }
  }

  async function handleStaffStatusChange(wo: WorkOrder, status: WorkOrderStatus) {
    setBusyId(wo.id);
    setActionError(null);
    try {
      await updateWorkOrder(wo.id, {
        property_id: wo.property_id,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        assigned_to: wo.assigned_to,
        due_date: wo.due_date,
        status,
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't update that work order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOwnStatusChange(id: string, status: WorkOrderStatus) {
    setBusyId(id);
    setActionError(null);
    try {
      await updateOwnWorkOrderStatus(id, status);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't update that work order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteWorkOrder(id: string) {
    if (!window.confirm("Delete this work order?")) return;
    setBusyId(id);
    setActionError(null);
    try {
      await deleteWorkOrder(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't delete that work order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkScheduleDone(schedule: MaintenanceSchedule) {
    setBusyId(schedule.id);
    setActionError(null);
    try {
      await markScheduleCompletedNow(schedule.id, schedule.interval_days);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't update that schedule.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateWorkOrderFromSchedule(scheduleId: string) {
    setBusyId(scheduleId);
    setActionError(null);
    try {
      await createWorkOrderFromSchedule(scheduleId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't create a work order for that.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteSchedule(id: string) {
    if (!window.confirm("Delete this maintenance schedule?")) return;
    setBusyId(id);
    setActionError(null);
    try {
      await deleteMaintenanceSchedule(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't delete that schedule.");
    } finally {
      setBusyId(null);
    }
  }

  const openWorkOrders = workOrders.filter((w) => w.status !== "done");
  const doneWorkOrders = workOrders.filter((w) => w.status === "done");

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
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Maintenance</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={isStaffUser} isSuperadmin={isSuperadmin} />
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
            <h3 style={{ marginTop: 0 }}>New work order</h3>
            <div className="filter-row">
              <div className="field">
                <label htmlFor="woProperty">Property</label>
                <select id="woProperty" value={woPropertyId} onChange={(e) => setWoPropertyId(e.target.value)}>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="woPriority">Priority</label>
                <select id="woPriority" value={woPriority} onChange={(e) => setWoPriority(e.target.value as "normal" | "urgent")}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="woDue">Due date (optional)</label>
                <input id="woDue" type="date" value={woDueDate} onChange={(e) => setWoDueDate(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="woTitle">Title</label>
              <input
                id="woTitle"
                type="text"
                placeholder="e.g. Dishwasher making noise"
                value={woTitle}
                onChange={(e) => setWoTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="woDescription">Description</label>
              <textarea
                id="woDescription"
                placeholder="Any detail worth passing along"
                value={woDescription}
                onChange={(e) => setWoDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="woAssign">Assign to (optional)</label>
              <select id="woAssign" value={woAssignedTo} onChange={(e) => setWoAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </select>
            </div>
            {woError ? <div className="error-banner">{woError}</div> : null}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateWorkOrder}
              disabled={creatingWo || !woPropertyId || !woTitle.trim()}
            >
              {creatingWo ? "Creating…" : "Create work order"}
            </button>
          </div>
        ) : null}

        <div className="property-card" style={{ maxWidth: 640, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>{isStaffUser ? "Open work orders" : "Your work orders"}</h3>
          {openWorkOrders.length === 0 ? <p className="access-note">Nothing open right now.</p> : null}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {openWorkOrders.map((wo) => (
              <li key={wo.id} className="property-card" style={{ maxWidth: "none", margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{wo.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{propertyNameById[wo.property_id] ?? "Property"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {wo.priority === "urgent" ? (
                      <span className="dispute-pill open">Urgent</span>
                    ) : null}
                    <span className="dispute-pill resolved">{SOURCE_LABEL[wo.source]}</span>
                    <span className="dispute-pill open">{STATUS_LABEL[wo.status]}</span>
                  </div>
                </div>
                {wo.description ? <p style={{ fontSize: 13.5, marginTop: 8 }}>{wo.description}</p> : null}
                <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                  {wo.assigned_to ? (
                    <>
                      Assigned to{" "}
                      {cleanerColorById[wo.assigned_to] ? (
                        <span className="cleaner-color-dot" style={{ background: cleanerColorById[wo.assigned_to] }} />
                      ) : null}
                      {cleanerNameById[wo.assigned_to] ?? "a cleaner"}
                    </>
                  ) : (
                    "Unassigned"
                  )}
                  {wo.due_date ? ` · Due ${new Date(wo.due_date).toLocaleDateString()}` : ""}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {isStaffUser ? (
                    <>
                      {wo.status !== "in-progress" ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyId === wo.id}
                          onClick={() => handleStaffStatusChange(wo, "in-progress")}
                        >
                          Mark in progress
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busyId === wo.id}
                        onClick={() => handleStaffStatusChange(wo, "done")}
                      >
                        Mark done
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busyId === wo.id}
                        onClick={() => handleDeleteWorkOrder(wo.id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      {wo.status !== "in-progress" ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyId === wo.id}
                          onClick={() => handleOwnStatusChange(wo.id, "in-progress")}
                        >
                          Start
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busyId === wo.id}
                        onClick={() => handleOwnStatusChange(wo.id, "done")}
                      >
                        Mark done
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {doneWorkOrders.length > 0 ? (
          <div className="property-card" style={{ maxWidth: 640, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Done</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {doneWorkOrders.map((wo) => (
                <li key={wo.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", padding: "6px 0" }}>
                  <span>
                    {wo.title} — {propertyNameById[wo.property_id] ?? "Property"}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    {wo.completed_at ? new Date(wo.completed_at).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isStaffUser ? (
          <div className="property-card" style={{ maxWidth: 640, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Preventative maintenance</h3>
            <p className="access-note">
              A recurring task per property (e.g. &quot;replace HVAC filter every 90 days&quot;) --
              independent of bookings. Once it&apos;s overdue, a work order gets created for it
              automatically; completing that work order rolls the due date forward.
            </p>
            <div className="filter-row">
              <div className="field">
                <label htmlFor="schedProperty">Property</label>
                <select id="schedProperty" value={schedPropertyId} onChange={(e) => setSchedPropertyId(e.target.value)}>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="schedInterval">Every (days)</label>
                <input
                  id="schedInterval"
                  type="number"
                  min={1}
                  value={schedIntervalDays}
                  onChange={(e) => setSchedIntervalDays(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="schedTitle">Title</label>
              <input
                id="schedTitle"
                type="text"
                placeholder="e.g. Replace HVAC filter"
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
              />
            </div>
            {schedError ? <div className="error-banner">{schedError}</div> : null}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateSchedule}
              disabled={creatingSched || !schedPropertyId || !schedTitle.trim()}
            >
              {creatingSched ? "Creating…" : "Add schedule"}
            </button>

            {schedules.length > 0 ? (
              <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {schedules.map((s) => {
                  const days = daysUntil(s.next_due_at);
                  const overdue = days < 0;
                  return (
                    <li key={s.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.title}</div>
                          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                            {propertyNameById[s.property_id] ?? "Property"} · every {s.interval_days} days
                          </div>
                        </div>
                        <div style={{ fontSize: 12.5, color: overdue ? "var(--coral)" : "var(--muted)", fontWeight: overdue ? 600 : 400, whiteSpace: "nowrap" }}>
                          {overdue ? `Overdue by ${Math.abs(days)}d` : `Due in ${days}d`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyId === s.id}
                          onClick={() => handleMarkScheduleDone(s)}
                        >
                          Mark done now
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyId === s.id}
                          onClick={() => handleCreateWorkOrderFromSchedule(s.id)}
                        >
                          Create work order
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busyId === s.id}
                          onClick={() => handleDeleteSchedule(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
