"use client";

import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "./actions";

const initialState: MagicLinkState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          Clean<span>Cal</span>
        </div>
        <p className="auth-sub">Sign in with a magic link sent to your email.</p>
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
    </div>
  );
}
