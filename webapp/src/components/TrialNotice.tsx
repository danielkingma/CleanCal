"use client";

import { useState, useSyncExternalStore } from "react";

const WARNING_WINDOW_DAYS = 30;

// Dismissal is remembered per calendar day (not "forever") so a real
// deadline doesn't get permanently silenced by one click -- it just
// stops nagging until tomorrow.
function dismissKey(daysRemaining: number) {
  return `trial-notice-dismissed-${new Date().toISOString().slice(0, 10)}-${daysRemaining}`;
}

// useSyncExternalStore (rather than useState+useEffect, see
// src/lib/useMediaQuery.ts for the same reasoning) sidesteps the
// SSR-mismatch problem entirely: the server snapshot is always `false`,
// and React re-syncs to the real localStorage value right after
// hydration without a synchronous setState-in-effect render. Nothing
// outside this component ever changes the key, so the "subscribe"
// function has nothing to actually listen for -- it only needs to
// exist to satisfy the hook's signature.
function usePersistedDismissed(key: string | null): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (!key) return false;
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

export default function TrialNotice({ trialEndsAt }: { trialEndsAt: string | null }) {
  // Date.now() is impure, so it's read once via a lazy initializer
  // (the one pattern React's purity check treats as intentional, same
  // idea as `useState(() => Math.random())`) rather than directly in
  // the render body -- a banner counting down in days doesn't need
  // per-render freshness anyway.
  const [now] = useState(() => Date.now());
  const daysRemaining = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const key = daysRemaining != null && daysRemaining <= WARNING_WINDOW_DAYS ? dismissKey(daysRemaining) : null;

  const persistedDismissed = usePersistedDismissed(key);
  // Gives immediate feedback on click without waiting for a localStorage
  // round-trip through useSyncExternalStore's snapshot to reflect it.
  const [justDismissed, setJustDismissed] = useState(false);
  const dismissed = persistedDismissed || justDismissed;

  if (daysRemaining == null || daysRemaining > WARNING_WINDOW_DAYS || dismissed) return null;

  function handleDismiss() {
    setJustDismissed(true);
    if (!key) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      // best-effort only -- worst case it asks again next render
    }
  }

  const ended = daysRemaining < 0;

  return (
    <div className={`trial-notice${ended ? " ended" : ""}`}>
      <span>
        {ended
          ? "Your free trial period has ended. Billing isn't turned on yet, so nothing has been charged -- but plan to add a payment method soon."
          : daysRemaining === 0
            ? "Your free trial ends today. Billing isn't turned on yet, so nothing will be charged automatically -- but plan to add a payment method soon."
            : `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Billing isn't turned on yet, so nothing will be charged automatically -- but plan to add a payment method soon.`}
      </span>
      <button type="button" className="trial-notice-dismiss" onClick={handleDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
