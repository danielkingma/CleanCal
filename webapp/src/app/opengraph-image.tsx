import { ImageResponse } from "next/og";

export const alt = "CleanCal — every turnover, tracked, cleaned, and paid.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Lives at the app root, so Next.js uses it as the default social-share
// image (og:image / twitter:image) for every route that doesn't define
// its own -- primarily the landing page, since that's the link people
// actually paste into Reddit, LinkedIn, or a text message.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f3ec",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* A plain ASCII "C" rather than a checkmark glyph -- Satori
              tries to dynamically fetch font coverage for non-Latin
              characters at render time, which fails the build (or the
              image) if that outbound fetch isn't available. */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#143f38",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              color: "#f6f3ec",
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#14231f" }}>
            <span>Clean</span>
            <span style={{ color: "#1f6f63" }}>Cal</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 36,
            color: "#5b6560",
            textAlign: "center",
            maxWidth: 880,
            display: "flex",
          }}
        >
          Every turnover, tracked, cleaned, and paid.
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 26,
            fontWeight: 600,
            color: "#143f38",
            letterSpacing: 2,
            display: "flex",
          }}
        >
          cleancal.net
        </div>
      </div>
    ),
    { ...size },
  );
}
