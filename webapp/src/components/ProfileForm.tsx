"use client";

import { useState } from "react";
import Link from "next/link";
import {
  startConnectOnboarding,
  startIdentityVerification,
  updateOrganizationName,
  updateOwnProfile,
} from "@/app/profile/actions";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";
import SignOutButton from "./SignOutButton";
import NavMenus from "./NavMenus";
import { isOwner, isStaff, type Profile } from "@/lib/types";

interface KnownDevice {
  id: string;
  label: string;
  last_seen_at: string;
}

export default function ProfileForm({
  profile,
  email,
  smsAvailable,
  devices,
  organizationName,
}: {
  profile: Profile;
  email: string;
  smsAvailable: boolean;
  devices: KnownDevice[];
  organizationName: string | null;
}) {
  const [name, setName] = useState(profile.name);
  const [orgName, setOrgName] = useState(organizationName ?? "");
  const [savingOrgName, setSavingOrgName] = useState(false);
  const [orgNameSaved, setOrgNameSaved] = useState(false);
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [smsOptIn, setSmsOptIn] = useState(profile.sms_opt_in ?? false);
  const [serviceArea, setServiceArea] = useState(profile.service_area ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [signedOutOthers, setSignedOutOthers] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateOwnProfile(name, bio, phone, serviceArea, smsOptIn);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyIdentity() {
    setVerifying(true);
    setVerifyError(null);
    try {
      const url = await startIdentityVerification(`${window.location.origin}/profile`);
      window.location.href = url;
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Couldn't start verification.");
      setVerifying(false);
    }
  }

  async function handleSaveOrgName() {
    if (!orgName.trim()) return;
    setSavingOrgName(true);
    setOrgNameSaved(false);
    setOrgNameError(null);
    try {
      await updateOrganizationName(orgName);
      setOrgNameSaved(true);
    } catch (e) {
      setOrgNameError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSavingOrgName(false);
    }
  }

  async function handleSignOutOthers() {
    if (!window.confirm("Sign out every other device or browser signed into this account? This one stays signed in.")) {
      return;
    }
    setSigningOutOthers(true);
    setSignOutError(null);
    setSignedOutOthers(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      setSignedOutOthers(true);
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Couldn't sign out other devices.");
    } finally {
      setSigningOutOthers(false);
    }
  }

  async function handleSetUpPayouts() {
    setOnboarding(true);
    setOnboardError(null);
    try {
      const url = await startConnectOnboarding(`${window.location.origin}/profile`);
      window.location.href = url;
    } catch (e) {
      setOnboardError(e instanceof Error ? e.message : "Couldn't start payout setup.");
      setOnboarding(false);
    }
  }

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
          <div style={{ color: "var(--muted)", fontSize: 14 }}>My Profile</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={isStaff(profile.role)} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>

      <main>
        <div className="property-card" style={{ maxWidth: 480 }}>
          <div className="field">
            <label>Email</label>
            <p className="access-note">{email}</p>
          </div>

          <div className="field">
            <label htmlFor="pName">Name</label>
            <input id="pName" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="pPhone">Phone</label>
            <input
              id="pPhone"
              type="tel"
              value={phone}
              placeholder="For admins/clients to reach you"
              onChange={(e) => setPhone(e.target.value)}
            />
            {smsAvailable ? (
              <label
                htmlFor="pSmsOptIn"
                style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontWeight: 400 }}
              >
                <input
                  id="pSmsOptIn"
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                />
                Also text me booking/job alerts (standard SMS rates may apply)
              </label>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="pServiceArea">Service area</label>
            <input
              id="pServiceArea"
              type="text"
              value={serviceArea}
              placeholder="e.g. Canberra, Queanbeyan"
              onChange={(e) => setServiceArea(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="pBio">Bio</label>
            <textarea
              id="pBio"
              value={bio}
              placeholder="A short intro — experience, availability, specialties"
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {saved ? <span style={{ fontSize: 12.5, color: "var(--teal-deep)" }}>Saved</span> : null}
          </div>
        </div>

        {isOwner(profile.role) ? (
          <div className="property-card" style={{ maxWidth: 480, marginTop: 16 }}>
            <div className="field">
              <label htmlFor="pOrgName">Business name</label>
              <p className="access-note">
                Shown to your team on invite messages and the Handbook. Signing up doesn&apos;t ask
                for this up front any more -- set or change it here whenever you like.
              </p>
              <input
                id="pOrgName"
                type="text"
                value={orgName}
                placeholder="e.g. Sunny Coast Cleaning"
                onChange={(e) => setOrgName(e.target.value)}
              />
              {orgNameError ? <div className="error-banner" style={{ marginTop: 10 }}>{orgNameError}</div> : null}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveOrgName}
                  disabled={savingOrgName || !orgName.trim()}
                >
                  {savingOrgName ? "Saving…" : "Save"}
                </button>
                {orgNameSaved ? <span style={{ fontSize: 12.5, color: "var(--teal-deep)" }}>Saved</span> : null}
              </div>
            </div>
          </div>
        ) : null}

        {profile.role === "cleaner" ? (
          <div className="property-card" style={{ maxWidth: 480, marginTop: 16 }}>
            <div className="field">
              <label>Identity verification</label>
              <p className="access-note">
                {profile.identity_status === "verified"
                  ? "Verified ✓"
                  : profile.identity_status === "pending"
                    ? "Verification in progress — this updates automatically once it's done."
                    : profile.identity_status === "failed"
                      ? "Verification didn't go through — you can try again."
                      : "Not verified yet."}
              </p>
              {profile.identity_status !== "verified" ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleVerifyIdentity}
                  disabled={verifying}
                >
                  {verifying
                    ? "Redirecting…"
                    : profile.identity_status === "pending" || profile.identity_status === "failed"
                      ? "Restart verification"
                      : "Verify identity"}
                </button>
              ) : null}
              {verifyError ? (
                <div className="error-banner" style={{ marginTop: 10 }}>
                  {verifyError}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {profile.role === "cleaner" ? (
          <div className="property-card" style={{ maxWidth: 480, marginTop: 16 }}>
            <div className="field">
              <label>Payouts</label>
              <p className="access-note">
                {profile.stripe_connect_status === "active"
                  ? "Payout account connected ✓"
                  : profile.stripe_connect_status === "pending"
                    ? "Payout setup started — finish it to get paid for jobs."
                    : "Not set up yet — connect a payout account to get paid for completed jobs."}
              </p>
              {profile.stripe_connect_status !== "active" ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSetUpPayouts}
                  disabled={onboarding}
                >
                  {onboarding
                    ? "Redirecting…"
                    : profile.stripe_connect_status === "pending"
                      ? "Finish payout setup"
                      : "Set up payouts"}
                </button>
              ) : null}
              {onboardError ? (
                <div className="error-banner" style={{ marginTop: 10 }}>
                  {onboardError}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="property-card" style={{ maxWidth: 480, marginTop: 16 }}>
          <div className="field">
            <label>Devices &amp; sessions</label>
            <p className="access-note">
              You can be signed in on more than one device at once -- a computer and a phone at
              the same time is fine. Whenever this account signs in somewhere new, you&apos;ll get
              a notification (if you have them enabled) naming the device.
            </p>
            {devices.length > 0 ? (
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                {devices.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span>{d.label}</span>
                    <span style={{ color: "var(--muted)" }}>
                      last seen {new Date(d.last_seen_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 12 }}
              onClick={handleSignOutOthers}
              disabled={signingOutOthers}
            >
              {signingOutOthers ? "Signing out…" : "Sign out other devices"}
            </button>
            <p className="access-note" style={{ marginTop: 6 }}>
              Ends every other session on this account -- this device stays signed in. Use this if
              you don&apos;t recognize a device that signed in, or just want to close out an old
              one.
            </p>
            {signedOutOthers ? (
              <p style={{ fontSize: 12.5, color: "var(--teal-deep)", marginTop: 4 }}>
                Done -- every other session has been signed out.
              </p>
            ) : null}
            {signOutError ? (
              <div className="error-banner" style={{ marginTop: 10 }}>
                {signOutError}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
