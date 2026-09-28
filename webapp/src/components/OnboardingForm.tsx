"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization, redeemInvite } from "@/app/onboarding/actions";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";

export default function OnboardingForm({
  inviteToken,
  inviteOrgName,
}: {
  inviteToken: string | null;
  inviteOrgName: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  // Separate from `name` above (that one's the business name, used only
  // in the create-a-business branch below) -- this is the person's own
  // name, required so it never falls back to handle_new_user()'s
  // email-derived default (see 0028_require_name_on_invite.sql for why).
  const [joinName, setJoinName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createOrganization(name);
      router.push("/calendar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create your business.");
      setSaving(false);
    }
  }

  async function handleJoin() {
    if (!inviteToken || !joinName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await redeemInvite(inviteToken, joinName);
      router.push("/calendar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join that business.");
      setSaving(false);
    }
  }

  if (inviteToken) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          {inviteOrgName ? (
            <>
              <p className="auth-sub">
                You&apos;ve been invited to join <strong>{inviteOrgName}</strong> on CleanCal.
              </p>
              <div className="auth-form">
                <div className="field">
                  <label htmlFor="joinName">Your name</label>
                  <input
                    id="joinName"
                    type="text"
                    required
                    placeholder="e.g. Alex Nguyen"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleJoin}
                disabled={saving || !joinName.trim()}
                style={{ width: "100%" }}
              >
                {saving ? "Joining…" : "Join"}
              </button>
            </>
          ) : (
            <p className="auth-error">This invite link is invalid or has already been used.</p>
          )}
          {error ? <p className="auth-error">{error}</p> : null}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <p className="auth-sub">Set up your business to get started.</p>
        <div className="auth-form">
          <div className="field">
            <label htmlFor="orgName">Business name</label>
            <input
              id="orgName"
              type="text"
              required
              placeholder="e.g. Sunny Coast Cleaning"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={saving || !name.trim()}
          >
            {saving ? "Creating…" : "Create my business"}
          </button>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
