import Link from "next/link";
import Logo from "./Logo";

const FEATURES = [
  {
    title: "Every platform, one calendar",
    body: "Airbnb, Vrbo, Booking.com, or a direct-booking site -- sync bookings in from any of them, and CleanCal syncs back out so nobody double-books a turnover.",
  },
  {
    title: "A cleaning team that runs itself",
    body: "Assign a job directly, or post it open for any cleaner on your team to claim. ID-verified, rated after every job, so you're never assigning blind.",
  },
  {
    title: "Payouts built in",
    body: "Set a rate per property once. Once a job's marked complete, pay the cleaner with a single click -- no invoices, no spreadsheets.",
  },
  {
    title: "Runs on the phone in your pocket",
    body: "Installs like a real app on iOS and Android, with push notifications the moment a job's posted, declined, or disputed.",
  },
];

const STEPS = [
  {
    title: "Connect your calendars",
    body: "Paste each property's export link. Every booking becomes a cleaning job automatically, the moment a guest checks out.",
  },
  {
    title: "Build your team",
    body: "Send an invite link. A cleaner verifies their own ID and sets up their own payout account -- nothing for you to chase.",
  },
  {
    title: "Jobs get claimed, done, and rated",
    body: "One-click claim, a photo-backed checklist, a rating when it's done. A dispute, if one comes up, stays contained to that one booking.",
  },
  {
    title: "Pay in one click",
    body: "See a \"Pay $X\" button right on the completed job. Click it. That's the whole payroll process.",
  },
];

const PRICING = [
  { tier: "1 property", price: "Free for 6 months, then $5/mo" },
  { tier: "2 – 15 properties", price: "$5 per property / mo" },
  { tier: "16 – 50 properties", price: "$150 / mo flat" },
  { tier: "51 – 100 properties", price: "$250 / mo flat" },
  { tier: "101 – 200 properties", price: "$350 / mo flat" },
  { tier: "201 – 500 properties", price: "$500 / mo flat" },
  { tier: "500+ properties", price: "Custom enterprise pricing" },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <Logo size={26} />
          Clean<span>Cal</span>
        </div>
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/handbook">Handbook</Link>
        </nav>
        <Link href="/login" className="btn btn-primary landing-nav-cta">
          Sign in
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <span className="landing-badge">✦ Free for your first 6 months</span>
          <h1>Every turnover, tracked, cleaned, and paid.</h1>
          <p className="landing-hero-sub">
            The cleaning-operations calendar for short-term rental hosts. Sync every booking from
            Airbnb, Vrbo, and Booking.com, hand the job to a vetted cleaner, and pay them without
            opening a spreadsheet.
          </p>
          <div className="landing-cta-row">
            <Link href="/login" className="btn btn-primary landing-cta-btn">
              Sign in to get started
            </Link>
            <Link href="/handbook" className="btn btn-secondary landing-cta-btn">
              Read the Handbook
            </Link>
          </div>
          <p className="landing-hero-note">No credit card required to start.</p>
        </section>

        <section className="landing-features" id="features">
          <span className="landing-section-eyebrow">What you get</span>
          <h2 className="landing-section-title">Everything a turnover needs, in one place</h2>
          <div className="landing-feature-grid">
            {FEATURES.map((f) => (
              <div className="landing-feature-card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-steps">
          <span className="landing-section-eyebrow">How it works</span>
          <h2 className="landing-section-title">Up and running in an afternoon</h2>
          <ol className="landing-step-list">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="landing-step-num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-pricing" id="pricing">
          <span className="landing-section-eyebrow">Pricing</span>
          <h2 className="landing-section-title">Free for your first 6 months</h2>
          <p className="landing-pricing-sub">
            Sign up today and use CleanCal free for 6 months while we finish rolling out billing.
            After that, pricing scales with how many properties you run -- never per booking, never
            per cleaner.
          </p>
          <div className="landing-pricing-table">
            {PRICING.map((row) => (
              <div className="landing-pricing-row" key={row.tier}>
                <span className="landing-pricing-tier">{row.tier}</span>
                <span className="landing-pricing-price">{row.price}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-final-cta">
          <h2>Ready to get your turnovers under control?</h2>
          <Link href="/login" className="btn btn-primary landing-cta-btn">
            Sign in to get started
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-nav-brand">
          <Logo size={20} />
          Clean<span>Cal</span>
        </div>
        <Link href="/handbook">CleanCal Handbook</Link>
      </footer>
    </div>
  );
}
