"use client";

import { useState } from "react";
import { removeCleaner, restoreCleaner } from "@/app/cleaners/actions";

// Owner-only in both directions -- the page only ever renders these for
// an owner (see cleaners/page.tsx), and the server actions re-check via
// RLS regardless, same posture as the existing role dropdown in
// TeamRoles.tsx.

export function RemoveCleanerButton({ cleanerId, cleanerName }: { cleanerId: string; cleanerName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(
      `Remove ${cleanerName || "this cleaner"}? They'll be signed out and won't be able to sign back in. ` +
        `Any of their not-yet-complete upcoming jobs go back on the open board for someone else to claim. ` +
        `Past bookings, ratings, and payout history are kept, and you can restore their access later if needed.`,
    );
    if (!confirmed) return;
    setError(null);
    setBusy(true);
    try {
      await removeCleaner(cleanerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove this cleaner.");
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" className="btn btn-danger" onClick={handleClick} disabled={busy}>
        {busy ? "Removing…" : "Remove from team"}
      </button>
      {error ? (
        <div className="error-banner" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function RestoreCleanerButton({ cleanerId }: { cleanerId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      await restoreCleaner(cleanerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't restore this cleaner.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-secondary" onClick={handleClick} disabled={busy}>
        {busy ? "Restoring…" : "Restore access"}
      </button>
      {error ? (
        <div className="error-banner" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
