"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization, forgetInviteToken, redeemInvite } from "@/app/onboarding/actions";
import InstallAppStep from "./InstallAppStep";
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
  // Set once the account itself is created/joined -- gates the "install
  // the app" step in front of the redirect below, rather than sending a
  // brand-new person straight into a browser tab with no nudge to install.
  const [readyToInstall, setReadyToInstall] = useState(false);

  function goToCalendar() {
    router.push("/calendar");
    router.refresh();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createOrganization(name);
      setReadyToInstall(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get you set up.");
      setSaving(false);
    }
  }

  // The invite shown here might be a day-old cookie fallback (see
  // login/actions.ts's sendMagicLink) rather than today's actual link --
  // this lets someone who doesn't recognize the business name, or who
  // really does want to start their own, get out of it instead of being
  // stuck joining whatever that cookie remembered.
  async function handleNotThisInvite() {
    setSaving(true);
    try {
      await forgetInviteToken();
    } finally {
      router.push("/onboarding");
      router.refresh();
    }
  }

  async function handleJoin() {
    if (!inviteToken || !joinName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await redeemInvite(inviteToken, joinName);
      setReadyToInstall(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join that business.");
      setSaving(false);
    }
  }

  if (readyToInstall) {
    return <InstallAppStep onContinue={goToCalendar} />;
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
              <p className="auth-sub" style={{ marginTop: 10, fontSize: 13 }}>
                Not your business?{" "}
                <button
                  type="button"
                  onClick={handleNotThisInvite}
                  disabled={saving}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--teal)", textDecoration: "underline", font: "inherit", cursor: "pointer" }}
                >
                  Start your own instead
                </button>
                .
              </p>
            </>
          ) : (
            <>
              <p className="auth-error">This invite link is invalid or has already been used.</p>
              <button type="button" className="btn btn-secondary" onClick={handleNotThisInvite} disabled={saving}>
                Start your own business instead
              </button>
            </>
          )}
          {error ? (
            <p className="auth-error">
              {error} Still stuck? Email <a href="mailto:support@cleancal.net">support@cleancal.net</a>.
            </p>
          ) : null}
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
        {error ? (
          <p className="auth-error">
            {error} Still stuck? Email <a href="mailto:support@cleancal.net">support@cleancal.net</a>.
          </p>
        ) : null}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
