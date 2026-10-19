"use client";

import { useState } from "react";

// Refer another host or property manager with the organization's own
// referral link, so a signup can be tracked and credited.
export default function ReferralShare({ link }: { link: string }) {
  const SITE = link;
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const message = `Hi! I use CleanCal to run the cleaning side of my short-stay properties: a shared calendar, cleaner assignment and room-by-room checklists with photos. It has a 3-month free trial and no card is needed to start. Have a look when you get a chance: ${SITE}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent("A tool I use for short-stay cleaning")}&body=${encodeURIComponent(message)}`;

  async function copy(what: "link" | "message", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be blocked; the text is still selectable.
    }
  }

  return (
    <div className="property-card">
      <h2 style={{ fontSize: 18, margin: 0 }}>Refer another business</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 14px" }}>
        Know another host or property manager who&apos;d like CleanCal? Send them the link or the message below. They
        sign up with their own account and their own business, separate from yours.
      </p>
      <div className="add-feed-row">
        <input type="text" readOnly value={SITE} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-secondary" onClick={() => copy("link", SITE)}>
          {copied === "link" ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="referralMessage">Suggested message — ready to paste into a text or email</label>
        <textarea id="referralMessage" readOnly value={message} onFocus={(e) => e.target.select()} rows={4} />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => copy("message", message)}>
            {copied === "message" ? "Copied" : "Copy message"}
          </button>
          <a href={mailtoHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Open in email
          </a>
        </div>
      </div>
    </div>
  );
}
