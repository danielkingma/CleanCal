"use client";

import { useState } from "react";
import { createInvite } from "@/app/cleaners/actions";
import type { Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  cleaner: "cleaner",
  manager: "manager",
  owner: "co-owner",
};

export default function InviteLink({
  isOwner,
  organizationName,
}: {
  isOwner: boolean;
  organizationName: string;
}) {
  const [role, setRole] = useState<Role>("cleaner");
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  const message = link
    ? `Hi! I'd like to add you as a ${ROLE_LABEL[role]} on ${organizationName}'s CleanCal — our cleaning schedule app. Tap this link to join, it takes about a minute: ${link}`
    : null;
  const mailtoHref = message
    ? `mailto:?subject=${encodeURIComponent(`Join ${organizationName} on CleanCal`)}&body=${encodeURIComponent(message)}`
    : null;

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

  async function handleCopyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch {
      // clipboard access can be blocked; the message is still selectable in the textarea
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
      {message ? (
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="inviteMessage">Suggested message — ready to paste into a text or email</label>
          <textarea
            id="inviteMessage"
            readOnly
            value={message}
            onFocus={(e) => e.target.select()}
            rows={3}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={handleCopyMessage}>
              {messageCopied ? "Copied" : "Copy message"}
            </button>
            {mailtoHref ? (
              <a href={mailtoHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
                Open in email
              </a>
            ) : null}
          </div>
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
