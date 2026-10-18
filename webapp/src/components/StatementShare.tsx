"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStatement, regenerateStatementLink, setStatementShare } from "@/app/statements/actions";

interface Props {
  id: string;
  token: string;
  enabled: boolean;
  clientEmail: string;
  clientName: string;
  periodLabel: string;
  origin: string;
}

export default function StatementShare({ id, token, enabled, clientEmail, clientName, periodLabel, origin }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = `${origin}/owner-statement/${token}`;

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const mail = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(`Your ${periodLabel} owner statement`)}&body=${encodeURIComponent(
    `Hi ${clientName},\n\nYour statement for ${periodLabel} is ready to view here:\n${url}\n\nKind regards`,
  )}`;

  return (
    <div className="property-card no-print" style={{ maxWidth: 820, marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Owner link</h3>
      <p className="access-note" style={{ marginTop: 0 }}>
        A private page your client can open without signing in. Anyone with the link can see this statement, so only
        switch it on when you&apos;re ready to send it. You can switch it off or replace the link at any time.
      </p>
      {error ? <p className="error-msg">{error}</p> : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn" disabled={busy} onClick={() => run(() => setStatementShare(id, !enabled))}>
          {enabled ? "Switch link off" : "Switch link on"}
        </button>
        {enabled ? (
          <>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  window.prompt("Copy this link", url);
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a className="btn" href={mail}>
              Email to client
            </a>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Replace the link? The old one stops working.")) {
                  setCopied(false);
                  void run(() => regenerateStatementLink(id));
                }
              }}
            >
              Replace link
            </button>
          </>
        ) : null}
      </div>
      {enabled ? (
        <p style={{ fontSize: 13, wordBreak: "break-all", marginBottom: 0 }}>{url}</p>
      ) : null}
      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "14px 0" }} />
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => {
          if (window.confirm("Delete this saved statement? The owner link stops working.")) {
            void run(async () => {
              await deleteStatement(id);
              router.push("/statements");
            });
          }
        }}
      >
        Delete saved statement
      </button>
    </div>
  );
}
