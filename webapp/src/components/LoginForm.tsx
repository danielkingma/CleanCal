"use client";

import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "@/app/login/actions";
import Logo from "@/components/Logo";

const initialState: MagicLinkState = { status: "idle" };

// Points at the published CleanCal Handbook artifact -- see the same
// constant in CalendarApp.tsx. Update both if the handbook ever moves.
const HANDBOOK_URL = "https://claude.ai/artifact/DTYa9CziQcXdn6cGeYncAG";

export default function LoginForm({ callbackFailed }: { callbackFailed: boolean }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <p className="auth-sub">Sign in with a magic link sent to your email.</p>
        {callbackFailed ? (
          <p className="auth-error">
            That sign-in link didn&apos;t work — it may have expired, already been used, or been
            opened in a different browser than the one you requested it from (this happens if your
            email app opens links in its own built-in browser). Request a new one below, and open
            it using the same browser you&apos;re signing in from right now.
          </p>
        ) : null}
        <form action={formAction} className="auth-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send magic link"}
          </button>
        </form>
        {state.message ? (
          <p className={state.status === "error" ? "auth-error" : "auth-success"}>
            {state.message}
          </p>
        ) : null}
      </div>
      <a href={HANDBOOK_URL} target="_blank" rel="noopener noreferrer" className="auth-footer-link">
        New here? Read the CleanCal Handbook
      </a>
    </div>
  );
}
