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
  // The person's own name -- required in both branches so it never falls
  // back to handle_new_user()'s email-derived default (see
  // 0028_require_name_on_invite.sql, and 0036_signup_asks_for_name_not_
  // business.sql which brought the create-a-business branch in line with
  // it). Neither branch asks for a business name up front any more --
  // create_organization() gives a new business a placeholder name, which
  // an Owner can change afterward from My Profile.
  const [name, setName] = useState("");
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
      setError(e instanceof Error ? e.message : "Couldn't get you set up.");
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
        <p className="auth-sub">Tell us your name to get started.</p>
        <div className="auth-form">
          <div className="field">
            <label htmlFor="orgName">Your name</label>
            <input
              id="orgName"
              type="text"
              required
              placeholder="e.g. Alex Nguyen"
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
            {saving ? "Setting up…" : "Continue"}
          </button>
        </div>
        <p className="auth-sub" style={{ marginTop: 10, fontSize: 13 }}>
          You can name your business afterward from My Profile.
        </p>
        {error ? <p className="auth-error">{error}</p> : null}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
