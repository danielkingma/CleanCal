import Link from "next/link";
import Logo from "@/components/Logo";

// FIRST-DRAFT LEGAL TEXT -- see the same note in src/app/privacy/page.tsx.
// Not reviewed by a lawyer. Review and fill in the business/jurisdiction
// details below before relying on this for real signups.
const LAST_UPDATED = "24 September 2026";
const CONTACT_EMAIL = "support@cleancal.net"; // placeholder -- make sure this inbox exists before publishing
const GOVERNING_LAW = "Australia"; // placeholder -- confirm your actual operating jurisdiction

export default function TermsPage() {
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
        <h1 style={{ marginTop: 18 }}>Terms of Service</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>

        <p>
          These terms govern your use of CleanCal (&quot;we,&quot; &quot;us,&quot;
          &quot;our&quot;). By creating an account or using CleanCal, you agree to them. If
          you&apos;re using CleanCal on behalf of a business, you&apos;re confirming you have
          authority to accept these terms for that business.
        </p>

        <h2>What CleanCal is</h2>
        <p>
          CleanCal is a scheduling and coordination tool for short-term rental cleaning
          operations: syncing bookings across listing platforms, assigning cleaning jobs to a
          team, running per-property cleaning checklists, and facilitating cleaner payouts via
          Stripe Connect. CleanCal is not a party to the underlying rental agreements between
          hosts and guests, and is not affiliated with Airbnb, Vrbo, Booking.com, or any other
          listing platform.
        </p>

        <h2>Accounts and roles</h2>
        <p>
          Each account belongs to one organization and has a role — Owner, Manager, or Cleaner —
          that determines what it can see and do, as described in the{" "}
          <Link href="/handbook">Handbook</Link>. You&apos;re responsible for keeping your
          account&apos;s sign-in email secure and for what happens under your account.
        </p>

        <h2>Subscriptions and payment</h2>
        <p>
          Pricing is described on our pricing page and in the Handbook. CleanCal does not
          currently charge for access or enforce these pricing tiers — this may change in the
          future, and we&apos;ll give notice before we begin billing existing accounts.
        </p>

        <h2>Cleaner payouts</h2>
        <p>
          Cleaner payouts are processed by Stripe, a third-party payment processor, through
          Stripe Connect. CleanCal facilitates the payout instruction at an Owner or
          Manager&apos;s direction; we don&apos;t hold your funds ourselves, and we&apos;re not
          responsible for delays, failures, or errors caused by Stripe or by incorrect payout
          details you or a cleaner enters. Disputes about whether a job was completed
          satisfactorily, or what a cleaner should be paid, are between the organization and the
          cleaner — our in-app dispute tool is provided to help resolve these, but we don&apos;t
          arbitrate or guarantee an outcome.
        </p>

        <h2>Identity verification and background checks</h2>
        <p>
          Cleaner ID verification (where completed) is a document- and selfie-based identity
          check performed by Stripe Identity — it confirms who someone says they are, not their
          criminal history, work history, or general trustworthiness. CleanCal does not currently
          perform criminal background checks. Don&apos;t rely on CleanCal for that; screen
          cleaners through your own process if that matters for your business.
        </p>

        <h2>Your content</h2>
        <p>
          You&apos;re responsible for the accuracy of what you enter into CleanCal — property
          details, checklist items, ratings, dispute messages, and photos — and for having the
          right to upload any photo you attach to a booking. Don&apos;t use CleanCal to upload
          unlawful content, harass another user, or attempt to access another organization&apos;s
          data.
        </p>

        <h2>Third-party platforms</h2>
        <p>
          Connecting a calendar feed from another platform is your responsibility, including
          complying with that platform&apos;s own terms of service. CleanCal isn&apos;t
          responsible for a listing platform changing, breaking, or discontinuing the calendar
          feeds we rely on to sync.
        </p>

        <h2>Disclaimers</h2>
        <p>
          CleanCal is provided &quot;as is,&quot; without warranties of any kind. We don&apos;t
          guarantee the service will be uninterrupted, error-free, or that calendar syncing will
          always prevent a double-booking — always use your own judgment for anything
          time-sensitive or safety-related.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, CleanCal isn&apos;t liable for indirect, incidental, or
          consequential damages arising from your use of the service, including lost bookings,
          lost income, or payout errors, beyond amounts actually processed incorrectly due to our
          own error.
        </p>

        <h2>Termination</h2>
        <p>
          You can stop using CleanCal at any time. We may suspend or terminate an account that
          violates these terms or misuses the service.
        </p>

        <h2>Governing law</h2>
        <p>These terms are governed by the laws of {GOVERNING_LAW}.</p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms from time to time. We&apos;ll update the &quot;Last
          updated&quot; date above when we do.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <p style={{ marginTop: 40 }}>
          <Link href="/privacy">Privacy Policy</Link> · <Link href="/handbook">CleanCal Handbook</Link>
        </p>
      </div>
    </div>
  );
}
