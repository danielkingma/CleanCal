"use client";

import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { sendMagicLink, verifyLoginCode, type MagicLinkState } from "@/app/login/actions";
import Logo from "@/components/Logo";

const initialState: MagicLinkState = { status: "idle" };

// Points at the published CleanCal Handbook artifact -- see the same
// constant in CalendarApp.tsx. Update both if the handbook ever moves.
const HANDBOOK_URL = "https://claude.ai/artifact/DTYa9CziQcXdn6cGeYncAG";

export default function LoginForm({ callbackFailed }: { callbackFailed: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const showCodeStep = state.status === "sent";

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      await verifyLoginCode(email, code.trim());
      router.push("/calendar");
      router.refresh();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "That code didn't work.");
      setVerifying(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <p className="auth-sub">Sign in with a code sent to your email.</p>
        {callbackFailed ? (
          <p className="auth-error">
            That sign-in link didn&apos;t work — this is common with Gmail, which automatically
            scans links and can use up a one-time link before you tap it. Request a new code below
            and enter the 6-digit number instead of tapping the link.
          </p>
        ) : null}
        <form action={formAction} className="auth-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send sign-in code"}
          </button>
        </form>
        {state.message ? (
          <p className={state.status === "error" ? "auth-error" : "auth-success"}>
            {state.message}
          </p>
        ) : null}

        {showCodeStep ? (
          <form onSubmit={handleVerify} className="auth-form" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="code">6-digit code</label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={verifying || !code.trim()}>
              {verifying ? "Verifying…" : "Verify code"}
            </button>
            {verifyError ? <p className="auth-error">{verifyError}</p> : null}
          </form>
        ) : null}
      </div>
      <a href={HANDBOOK_URL} target="_blank" rel="noopener noreferrer" className="auth-footer-link">
        New here? Read the CleanCal Handbook
      </a>
    </div>
  );
}
