"use client";

import { useState } from "react";
import { updateUserRole } from "@/app/cleaners/actions";
import type { Profile, Role } from "@/lib/types";

const ROLE_OPTIONS: Role[] = ["owner", "manager", "cleaner"];

interface TeamRolesProps {
  profiles: Profile[];
  currentUserId: string;
}

export default function TeamRoles({ profiles, currentUserId }: TeamRolesProps) {
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
      <table className="feed-table">
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.name || "(no name set)"}</td>
              <td>
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
              </td>
              {p.id === currentUserId ? (
                <td style={{ fontSize: 12.5, color: "var(--muted)" }}>You</td>
              ) : (
                <td />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
