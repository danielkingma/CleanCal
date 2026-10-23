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

interface TrialNoticeProps {
  trialEndsAt: string | null;
  // Set only by hand in Supabase when a special/negotiated deal has been
  // struck with this business -- see 0032_special_pricing_agreements.sql.
  // Neither has anything to do with the standard tiered pricing the
  // trial countdown below warns about, so when either is set this shows
  // a plain informational note instead, regardless of trialEndsAt.
  customMonthlyPriceCents: number | null;
  pricingAgreementNotes: string | null;
  // organizations.subscription_status -- null until an owner has started
  // Checkout at least once (startBillingCheckout in
  // src/app/profile/actions.ts). Once that's happened, whether billing
  // will actually start and when is Stripe's own trial_end on the
  // subscription Checkout created, which the Profile page's Billing
  // section explains -- this countdown banner stands down rather than
  // risk contradicting it (it predates real billing existing at all, and
  // used to flatly promise "nothing will be charged automatically",
  // which stopped being true the moment a subscription with a trial_end
  // exists).
  subscriptionStatus: string | null;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}

export default function TrialNotice({
  trialEndsAt,
  customMonthlyPriceCents,
  pricingAgreementNotes,
  subscriptionStatus,
}: TrialNoticeProps) {
  const hasCustomAgreement = customMonthlyPriceCents != null || !!pricingAgreementNotes;
  const customKey = hasCustomAgreement ? `pricing-notice-dismissed-${new Date().toISOString().slice(0, 10)}` : null;
  const customDismissedPersisted = usePersistedDismissed(customKey);
  const [customJustDismissed, setCustomJustDismissed] = useState(false);
  const customDismissed = customDismissedPersisted || customJustDismissed;

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

  if (hasCustomAgreement) {
    if (customDismissed) return null;
    return (
      <div className="trial-notice custom">
        <span>
          You have a custom pricing agreement
          {customMonthlyPriceCents != null ? ` — $${formatCents(customMonthlyPriceCents)}/month` : ""}
          {customMonthlyPriceCents != null ? ", once billing starts" : ""}
          {pricingAgreementNotes ? ` (${pricingAgreementNotes})` : ""}. The standard pricing shown in the
          Handbook doesn&apos;t apply to your account.
        </span>
        <button
          type="button"
          className="trial-notice-dismiss"
          onClick={() => {
            setCustomJustDismissed(true);
            if (!customKey) return;
            try {
              localStorage.setItem(customKey, "1");
            } catch {
              // best-effort only -- worst case it asks again next render
            }
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  }

  // Once Checkout has actually been started (see subscriptionStatus's
  // comment above), the Profile page's Billing section is the
  // authoritative place for what happens next -- this banner stands down
  // rather than potentially contradict it.
  if (subscriptionStatus != null) return null;

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
          ? "Your free trial period has ended. Nothing has been charged -- you haven't set up billing yet, so there's no subscription to bill. Head to your Profile's Billing section whenever you're ready ($2/property/month)."
          : daysRemaining === 0
            ? "Your free trial ends today. You haven't set up billing yet, so enjoy full access for free while it lasts -- set it up any time from your Profile's Billing section ($2/property/month)."
            : `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. You haven't set up billing yet -- do that from your Profile's Billing section whenever suits ($2/property/month) so you're not interrupted once the trial ends.`}
      </span>
      <button type="button" className="trial-notice-dismiss" onClick={handleDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
