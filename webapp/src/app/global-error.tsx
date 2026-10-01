"use client";

// The rare counterpart to error.tsx: catches a throw from the root
// layout itself (not just a page under it), which is why this has to
// supply its own <html>/<body> -- there's no outer layout left standing
// to provide them. Kept deliberately plain (inline styles, no shared
// components) since whatever broke the root layout might also be why a
// shared component fails to render.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf7f0", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 600 }}>CleanCal</div>
          <p style={{ color: "#6b6456", fontSize: 14, maxWidth: 360 }}>
            Something went wrong loading the app. Try reloading the page.
          </p>
          <a
            href="/calendar"
            style={{
              border: "1px solid #ddd6c7",
              background: "#fff",
              borderRadius: 7,
              padding: "8px 16px",
              fontSize: 13.5,
              fontWeight: 500,
              color: "#1a1a1a",
              textDecoration: "none",
            }}
          >
            Reload
          </a>
          {error.digest ? (
            <p style={{ fontSize: 11.5, fontFamily: "monospace", color: "#9a9284" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
