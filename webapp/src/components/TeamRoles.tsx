"use client";

import { useState } from "react";
import { updateUserRole } from "@/app/cleaners/actions";
import type { Profile, Role } from "@/lib/types";

const ROLE_OPTIONS: Role[] = ["owner", "manager", "cleaner"];

// Owners first, then Managers, then Cleaners; by name within each.
const ROLE_RANK: Record<Role, number> = { owner: 0, manager: 1, cleaner: 2 };

interface TeamRolesProps {
  profiles: Profile[];
  currentUserId: string;
  emailById: Record<string, string>;
}

export default function TeamRoles({ profiles, currentUserId, emailById }: TeamRolesProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: Role) {
    setError(null);
    setSavingId(userId);
    try {
      await updateUserRole(userId, role);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update role.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="property-card">
      <h2 style={{ fontSize: 18, margin: 0 }}>Team roles</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 14px" }}>
        Owners see everything, including financials once they exist. Managers get the same
        day-to-day access but can&apos;t change roles or delete properties.
      </p>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="team-role-list">
        {[...profiles]
          .sort(
            (a, b) =>
              (ROLE_RANK[a.role] ?? 3) - (ROLE_RANK[b.role] ?? 3) || (a.name ?? "").localeCompare(b.name ?? ""),
          )
          .map((p) => (
          <div className="team-role-row" key={p.id}>
            <span className="team-role-name">
              {p.name || "(no name set)"}
              {emailById[p.id] ? (
                <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>{emailById[p.id]}</span>
              ) : null}
            </span>
            <span className="team-role-controls">
              <select
                value={p.role}
                disabled={p.id === currentUserId || savingId === p.id}
                onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {p.id === currentUserId ? <span className="team-role-you">You</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
