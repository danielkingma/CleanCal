import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const TITLE = "CleanCal";
const DESCRIPTION =
  "Every turnover, tracked, cleaned, and paid. The cleaning-operations calendar for short-term rental hosts -- sync bookings from every platform, run your cleaning team, and pay them, all in one place.";

export const metadata: Metadata = {
  // Resolves the opengraph-image route to an absolute URL in og:image
  // meta tags -- without it, Next.js falls back to localhost, which is
  // meaningless once shared outside this machine. Reuses the same env
  // var the login flow's magic-link redirect already relies on.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cleancal.net"),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CleanCal",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  // Without this, sharing a cleancal.net link (Reddit, LinkedIn, a text
  // message) shows a bare link or a blank card instead of a proper
  // preview -- opengraph-image.tsx supplies the image itself; Next.js
  // wires it into these automatically since it lives at the app root.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "CleanCal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#143f38",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
