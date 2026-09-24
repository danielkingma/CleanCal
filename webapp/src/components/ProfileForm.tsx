"use client";

import { useState } from "react";
import Link from "next/link";
import { updateOwnProfile } from "@/app/profile/actions";
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

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <div style={{ color: "rgba(246, 243, 236, 0.8)", fontSize: 14 }}>My Profile</div>
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
      </main>
    </div>
  );
}
