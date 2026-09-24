import Link from "next/link";
import Logo from "@/components/Logo";

// FIRST-DRAFT LEGAL TEXT -- accurate to what the product actually does
// as of the date below, but not reviewed by a lawyer. Get it reviewed
// (Australian Privacy Principles apply given the AUD-denominated Stripe
// payouts in src/lib/stripe.ts; add GDPR/CCPA language too if you expect
// EU/California users) before relying on this for real signups,
// especially given Stripe Identity handles biometric ID data.
const LAST_UPDATED = "24 September 2026";
const CONTACT_EMAIL = "support@cleancal.net"; // placeholder -- make sure this inbox exists before publishing

export default function PrivacyPage() {
  return (
    <div className="hb-page">
      <div className="hb-content" style={{ maxWidth: 720 }}>
        <Link href="/" className="legal-back">
          ← Back to CleanCal
        </Link>

        <div className="hb-side-brand" style={{ marginTop: 24, marginBottom: 4 }}>
          <Logo size={22} />
          Clean<span>Cal</span>
        </div>
        <h1 style={{ marginTop: 18 }}>Privacy Policy</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>

        <p>
          This policy explains what information CleanCal (&quot;we,&quot; &quot;us,&quot;
          &quot;our&quot;) collects when you use the CleanCal app, why we collect it, and
          who we share it with. It applies to everyone who uses CleanCal — property owners,
          managers, and cleaners.
        </p>

        <h2>Information we collect</h2>
        <h3>Account information</h3>
        <p>
          Your email address (used for passwordless sign-in), your name, and the business
          (&quot;organization&quot;) you belong to. Cleaners can optionally add a bio, phone
          number, and service area to their profile.
        </p>
        <h3>Identity verification</h3>
        <p>
          If you complete cleaner ID verification, your government ID and a live selfie are
          collected and processed directly by Stripe Identity, our verification provider. We
          do not receive or store the ID image or selfie ourselves — we only receive and store
          the verification result (verified, pending, or failed).
        </p>
        <h3>Payout information</h3>
        <p>
          If you connect a payout account as a cleaner, your bank and identity details for that
          purpose are collected and held by Stripe (via Stripe Connect), not by us. We store only
          the connected account&apos;s status and ID, not your bank details.
        </p>
        <h3>Booking and property information</h3>
        <p>
          If you connect a calendar feed from Airbnb, Vrbo, Booking.com, or another platform, we
          import booking dates, nights, and — where the platform provides it — a guest name.
          Property owners and managers also enter access instructions and payout rates for their
          own properties.
        </p>
        <h3>Content you create</h3>
        <p>
          Cleaning checklist progress, photos attached to a booking, cleaner ratings and review
          comments, and dispute messages posted between staff and cleaners.
        </p>
        <h3>Device and usage information</h3>
        <p>
          If you enable push notifications, we store a device push token so we can deliver alerts
          (a new job assigned, a dispute posted, and similar). Standard web server logs (IP
          address, browser type, pages visited) are retained by our hosting provider for security
          and debugging.
        </p>

        <h2>How we use this information</h2>
        <ul>
          <li>To operate the core service: syncing calendars, assigning cleaning jobs, running checklists, and processing payouts.</li>
          <li>To verify a cleaner&apos;s identity before they can be assigned jobs, where that feature is used.</li>
          <li>To send you sign-in codes, job notifications, and service-related emails or push notifications.</li>
          <li>To investigate and resolve disputes raised through the in-app dispute tool.</li>
          <li>To maintain the security and integrity of the service.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for advertising.</p>

        <h2>Who we share it with</h2>
        <ul>
          <li>
            <strong>Your own organization.</strong> Data you enter is visible to the Owners,
            Managers, and (where relevant, e.g. an assigned job) Cleaners within your own business
            on CleanCal. It is never visible to a different business on CleanCal.
          </li>
          <li>
            <strong>Stripe</strong>, for identity verification (Stripe Identity) and cleaner
            payouts (Stripe Connect). Stripe&apos;s own privacy policy governs the data it
            processes directly.
          </li>
          <li>
            <strong>Supabase</strong>, our database, authentication, and file-storage provider.
          </li>
          <li>
            <strong>Vercel</strong>, our hosting provider.
          </li>
          <li>
            The booking platforms you connect (Airbnb, Vrbo, Booking.com, etc.), only in the
            sense that we send back the availability your CleanCal calendar creates, so those
            platforms don&apos;t double-book a date.
          </li>
          <li>Law enforcement or regulators, only where we&apos;re legally required to.</li>
        </ul>

        <h2>Data retention and deletion</h2>
        <p>
          We retain your information for as long as your account is active. If you&apos;d like
          your account and associated data deleted, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Some records (e.g. completed
          payout records) may be retained longer where we&apos;re required to for accounting or
          legal reasons.
        </p>

        <h2>Your rights</h2>
        <p>
          You can review and update most of your own information directly in the app (My
          Profile). You can request a copy of your data, ask us to correct it, or ask us to
          delete it, by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>Security</h2>
        <p>
          We rely on our infrastructure providers&apos; (Supabase, Stripe, Vercel) security
          practices, and enforce access control in our own database so that one business&apos;s
          data is never visible to another. No method of storing or transmitting data is 100%
          secure, and we can&apos;t guarantee absolute security.
        </p>

        <h2>Children&apos;s privacy</h2>
        <p>CleanCal is a business tool and is not directed at, or intended for use by, children.</p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. We&apos;ll update the &quot;Last
          updated&quot; date above when we do.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p style={{ marginTop: 40 }}>
          <Link href="/terms">Terms of Service</Link> · <Link href="/handbook">CleanCal Handbook</Link>
        </p>
      </div>
    </div>
  );
}
