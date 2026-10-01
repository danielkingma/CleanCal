"use client";

import { useEffect } from "react";
import Logo from "@/components/Logo";

// Next.js's App Router error boundary -- catches anything an uncaught
// exception throws during render anywhere under the root layout (a
// Server Component query that threw instead of returning an error field,
// a bug in a client component's render, etc). Without this file, that
// surfaced as the raw "Minified React error #441 ... digest property"
// text straight on the page -- technically correct, but meaningless and
// alarming to someone who isn't debugging it, and with no way back
// except however they got there (back button, re-typing the URL).
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Not shown to the person using the app -- production strips the real
  // message client-side (see react.dev/errors/441), so this is purely so
  // the digest lands in the browser console for whoever's debugging,
  // since we have no server log access of our own from here.
  useEffect(() => {
    console.error("CleanCal error boundary caught:", error);
  }, [error]);

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="brand" style={{ justifyContent: "center" }}>
          <Logo />
          Clean<span>Cal</span>
        </div>
        <p className="auth-sub">
          Something went wrong loading this page. It&apos;s been logged -- try again, and if it
          keeps happening, let your Owner/Manager know.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <a href="/calendar" className="btn btn-secondary">
            Back to calendar
          </a>
        </div>
        {error.digest ? (
          <p className="auth-sub" style={{ marginTop: 18, fontSize: 11.5, fontFamily: "monospace" }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
