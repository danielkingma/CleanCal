import Link from "next/link";
import Logo from "./Logo";
import DeviceShowcase from "./DeviceShowcase";

const FEATURES = [
  {
    title: "Every platform, one calendar",
    body: "Airbnb, Vrbo, Booking.com, a direct-booking site, or any calendar link -- sync bookings in from all of them, and CleanCal syncs back out so nobody double-books a turnover. Colour-coded by cleaning status, with a platform badge on every stay.",
  },
  {
    title: "A cleaning team that runs itself",
    body: "Assign a job directly, or post it open for any cleaner on your team to claim -- first to tap gets it, so two cleaners can never grab the same job. Cleaners confirm or decline, and a declined job goes straight back on the board.",
  },
  {
    title: "Room-by-room checklists with photo proof",
    body: "A professional turnover checklist that scales to each property's real bedrooms, bathrooms and outdoor area. Cleaners add photos as they go (blurry ones get flagged), and flag anything that needs your attention with one tap.",
  },
  {
    title: "Know who you're sending",
    body: "Cleaners verify their own ID with a government ID and a live selfie, every job gets a 1-5 star rating, and you see each cleaner's average before you assign them. Poor rating? A re-clean work order is raised automatically.",
  },
  {
    title: "Maintenance and supplies, sorted",
    body: "Work orders for repairs, recurring preventative maintenance that raises its own job when it goes overdue, and a stock list that tells you when the toilet paper is running low -- all per property, all in the same app.",
  },
  {
    title: "Dashboard, reports and CSV export",
    body: "See what needs you today: cleans due this week, unclaimed jobs, open disputes. Then dig into cleans by property and cleaner, average cost to turn over, fastest cleaner and trends over time -- and export it all to a spreadsheet.",
  },
  {
    title: "Runs on the phone in your pocket",
    body: "Installs like a real app on iPhone and Android with no app store, and sends push alerts the moment a job is posted, assigned, declined, rated or disputed. Cleaners get their own simple phone-first view.",
  },
  {
    title: "Built for a team, with the right access",
    body: "Owners, Managers and Cleaners each see exactly what they should -- enforced on the server, not just hidden on screen. Pay rates stay Owner-only, and your business's data is completely separate from everyone else's.",
  },
  {
    title: "Disputes without the drama",
    body: "A problem on a booking opens a private thread between you and the cleaner, attached to that one job -- no lost texts, and nothing gets buried.",
  },
  {
    title: "Cleaner availability",
    body: "Cleaners mark the days they can't work, and you get a warning if you try to give them a job on one of those days.",
  },
  {
    title: "Cleaner payouts -- coming soon",
    body: "Set a rate per property once, and pay a cleaner with a single click once a job is complete, linen fee included. The rates and setup are already in the app; switching on live payments is next.",
  },
  {
    title: "Owner statements -- in beta",
    body: "Manage properties for landlords? Add your clients and fee rules, then import Airbnb and Booking.com payouts and have them matched to the right property and stay. Monthly statements are the next step.",
  },
];

const ROLES = [
  {
    title: "For owners",
    points: [
      "One calendar for the whole portfolio",
      "Full control of team, roles and pay rates",
      "Dashboard, reports and CSV export",
      "Owner statements add-on (beta)",
    ],
  },
  {
    title: "For managers",
    points: [
      "Run the day-to-day without the keys to the business",
      "Assign, rate and resolve disputes",
      "Properties, maintenance and supplies",
      "Invite new cleaners in a tap",
    ],
  },
  {
    title: "For cleaners",
    points: [
      "Claim open jobs and see your own schedule",
      "Simple checklist and photos on your phone",
      "Mark the days you can't work",
      "See your history and ratings",
    ],
  },
];

const WHY = [
  { title: "Priced per property", body: "Never per booking, never per cleaner. One property is free, and up to 50 are free for 3 months." },
  { title: "No card to start", body: "Sign up with just your email -- there's no password to remember, and nothing is charged while you try it." },
  { title: "Set up in an afternoon", body: "Paste each property's calendar link, invite your cleaners with a link, and you're running." },
  { title: "Self-serve with a real Handbook", body: "A full Handbook and a short cleaner guide walk through every screen, and we answer every email to support@cleancal.net." },
];

const FAQ = [
  {
    q: "Does CleanCal connect to my PMS?",
    a: "CleanCal doesn't connect directly into a property management system. It works from calendar (iCal) links instead: paste each property's calendar export link from Airbnb, Vrbo, Booking.com, your own website or any system that offers one, and your bookings appear on one shared calendar. Check whether yours can give you a calendar link -- if it can, it will work alongside it.",
  },
  {
    q: "Do I need a credit card?",
    a: "No. You can start with just your email. One property is free, and 2 to 50 properties are free for 3 months. You'll be reminded well before anything would ever be billed.",
  },
  {
    q: "Do my cleaners need to pay or install anything?",
    a: "Cleaners join with an invite link from you. They can use CleanCal in a browser or install it on their phone's home screen in seconds -- no app store. Pricing is by property, never per cleaner.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Each business's data is completely separate, and what each person can see is enforced on the server: a cleaner genuinely can't reach manager-level information.",
  },
  {
    q: "Will it stop double-bookings?",
    a: "CleanCal syncs bookings in from your platforms and gives every property its own calendar link to paste back into each platform, so a booking made on one shows up as taken on the others.",
  },
  {
    q: "Who is behind CleanCal?",
    a: "CleanCal is built by a Canberra short-stay manager who has run the cleans, the cleaners and the spreadsheets, and made the tool they wished they had.",
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
    title: "Pay in one click (coming soon)",
    body: "Live payments are being switched on next: you'll see a \"Pay $X\" button right on the completed job, click it, and that's the whole payroll process.",
  },
];

const PRICING = [
  { tier: "1 property", price: "Free" },
  { tier: "2 – 50 properties", price: "Free for 3 months, then $5/property/mo" },
  { tier: "51 – 100 properties", price: "$295 / mo flat" },
  { tier: "101 – 500 properties", price: "$495 / mo flat" },
  { tier: "501+ properties", price: "Custom enterprise pricing" },
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
          <a href="#faq">FAQ</a>
          <Link href="/handbook">Handbook</Link>
        </nav>
        <Link href="/login" className="btn btn-primary landing-nav-cta">
          Sign in
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <span className="landing-badge">✦ 1 property free, or up to 50 free for 3 months</span>
          <h1>Every turnover, tracked, cleaned, and paid.</h1>
          <p className="landing-hero-sub">
            The cleaning-operations calendar for short-term rental hosts and managers. Sync every
            booking from Airbnb, Vrbo, and Booking.com, hand the job to a vetted cleaner, and
            track it from checklist to photo proof to rating -- on one shared calendar, at a
            fraction of the cost of the big systems.
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
          <ul className="landing-chips">
            <li>Free for 1 property</li>
            <li>3 months free up to 50</li>
            <li>Works on any phone</li>
            <li>No app store needed</li>
            <li>Built in Canberra</li>
          </ul>
          <figure className="landing-video landing-video-hero">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/videos/cleancal-intro-poster.png"
              aria-label="A 25-second introduction to CleanCal"
            >
              <source src="/videos/cleancal-intro.mp4" type="video/mp4" />
            </video>
            <figcaption>Meet Cal: CleanCal in 25 seconds.</figcaption>
          </figure>
          <DeviceShowcase
            monitorSrc="/handbook/calendar-example.png"
            monitorAlt="The CleanCal calendar, month view, open in a desktop browser"
            monitorCaption="Run the whole portfolio from a desktop browser."
            phoneSrc="/handbook/app-mobile-example.png"
            phoneAlt="CleanCal installed on a phone"
            phoneCaption="Installs right onto a phone's home screen -- no app store."
          />
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

        <section className="landing-roles">
          <span className="landing-section-eyebrow">For your whole team</span>
          <h2 className="landing-section-title">A view for everyone who touches a turnover</h2>
          <div className="landing-feature-grid">
            {ROLES.map((r) => (
              <div className="landing-feature-card" key={r.title}>
                <h3>{r.title}</h3>
                <ul className="landing-tick-list">
                  {r.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-story">
          <span className="landing-section-eyebrow">Why it exists</span>
          <h2 className="landing-section-title">Built by a short-stay manager, for hosts</h2>
          <p>
            CleanCal comes from years of running a short-stay management business in Canberra: the
            late-night texts, the spreadsheets, and cleans that didn&apos;t quite line up with the
            bookings. The big platforms were either too limited or too expensive for the hosts who
            needed them most.
          </p>
          <p>
            So the founder handed most of their own listings away to put everything into building
            the tool they wished they had -- super cheap, but carrying most of the tech of the
            expensive systems, so small and mid-sized operators aren&apos;t priced out of proper
            help.
          </p>
        </section>

        <section className="landing-steps">
          <span className="landing-section-eyebrow">How it works</span>
          <h2 className="landing-section-title">Up and running in an afternoon</h2>
          <figure className="landing-video">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/videos/cleancal-signup-poster.png"
              aria-label="A 30-second walkthrough of signing up to CleanCal"
            >
              <source src="/videos/cleancal-signup.mp4" type="video/mp4" />
            </video>
            <figcaption>Watch: signing up takes about a minute.</figcaption>
          </figure>
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

        <section className="landing-why">
          <span className="landing-section-eyebrow">Why hosts switch</span>
          <h2 className="landing-section-title">Simple, fair and easy to start</h2>
          <div className="landing-feature-grid">
            {WHY.map((w) => (
              <div className="landing-feature-card" key={w.title}>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-pricing" id="pricing">
          <span className="landing-section-eyebrow">Pricing</span>
          <h2 className="landing-section-title">1 property free, or up to 50 free for 3 months</h2>
          <p className="landing-pricing-sub">
            No credit card required to start. Beyond that, pricing scales with
            how many properties you run -- never per booking, never per cleaner. Billing is
            coming soon, so enjoy full access for free while it lasts.
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

        <section className="landing-faq" id="faq">
          <span className="landing-section-eyebrow">Questions</span>
          <h2 className="landing-section-title">Good questions, straight answers</h2>
          <div className="landing-faq-list">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="landing-faq-more">
            More in the <Link href="/handbook">Handbook</Link>, or email{" "}
            <a href="mailto:support@cleancal.net">support@cleancal.net</a>.
          </p>
        </section>

        <section className="landing-final-cta">
          <h2>Ready to get your turnovers under control?</h2>
          <p className="landing-final-sub">Free to start. No card. Set up in an afternoon.</p>
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
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/handbook">CleanCal Handbook</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href="mailto:support@cleancal.net">Contact support</a>
        </div>
      </footer>
    </div>
  );
}
