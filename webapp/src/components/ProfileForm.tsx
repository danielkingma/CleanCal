"use client";

import { useState } from "react";
import Link from "next/link";
import { startIdentityVerification, updateOwnProfile } from "@/app/profile/actions";
import Logo from "./Logo";
import type { Profile } from "@/lib/types";

export default function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [serviceArea, setServiceArea] = useState(profile.service_area ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateOwnProfile(name, bio, phone, serviceArea);
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

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>My Profile</div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/calendar" className="today-btn">
            ← Calendar
          </Link>
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
      </main>
    </div>
  );
}
