"use client";

import { useState } from "react";
import { createInvite } from "@/app/cleaners/actions";
import type { Role } from "@/lib/types";

export default function InviteLink({ isOwner }: { isOwner: boolean }) {
  const [role, setRole] = useState<Role>("cleaner");
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setLink(null);
    try {
      const token = await createInvite(role);
      setLink(`${window.location.origin}/onboarding?invite=${token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create invite.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access can be blocked; the link is still selectable in the input
    }
  }

  return (
    <div className="property-card">
      <h2 style={{ fontSize: 18, margin: 0 }}>Invite someone to your team</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 14px" }}>
        Share a link to bring a new {isOwner ? "cleaner, manager, or owner" : "cleaner"} into your
        business. Each link works once.
      </p>
      <div className="add-feed-row">
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="cleaner">Cleaner</option>
          {isOwner ? <option value="manager">Manager</option> : null}
          {isOwner ? <option value="owner">Owner</option> : null}
        </select>
        <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating…" : "Generate invite link"}
        </button>
      </div>
      {link ? (
        <div className="add-feed-row" style={{ marginTop: 10 }}>
          <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="error-banner" style={{ marginTop: 10 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
