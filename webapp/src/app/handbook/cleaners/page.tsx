import Link from "next/link";

// A short, cleaner-only companion to the full Handbook (src/app/handbook/
// page.tsx) -- that page is genuinely useful but covers a lot a cleaner
// never touches (properties, sync, pricing, team management). This page
// is just the handful of things a cleaner actually needs, in the order
// they need them, so someone brand new can read it in a couple of
// minutes on their phone instead of scrolling past everything else.
export default function CleanerGuidePage() {
  return (
    <div className="hb-page">
      <Link href="/calendar" className="hb-back-toggle">
        ← Calendar
      </Link>
      <div className="hb-shell">
        <main className="hb-main" style={{ width: "100%" }}>
          <div className="hb-content" style={{ maxWidth: 720 }}>
            <Link href="/calendar" style={{ fontSize: 13.5, fontWeight: 600 }}>
              ← Back to Calendar
            </Link>
            <div className="hb-hero">
              <span className="hb-eyebrow">Cleaner quick guide</span>
              <h1>Everything you need, in five minutes.</h1>
              <p>
                This is the short version, just for cleaners — install the app, find a job, do
                the clean, get paid. For everything else, the{" "}
                <Link href="/handbook">full Handbook</Link> has it.
              </p>
            </div>

            <section className="hb-section">
              <span className="hb-kicker">1</span>
              <h2>Install the app</h2>
              <p>
                CleanCal installs straight from your phone&apos;s browser — no App Store, no
                download to manage.
              </p>
              <h3>iPhone (Safari)</h3>
              <ol className="hb-step-list">
                <li>Open <span className="hb-kbd-chip">cleancal.net</span> in Safari (it has to be Safari, not Chrome).</li>
                <li>Tap the Share icon (square with an arrow up) in the toolbar.</li>
                <li>Scroll down, tap <span className="hb-kbd-chip">Add to Home Screen</span>, then <span className="hb-kbd-chip">Add</span>.</li>
              </ol>
              <h3>Android (Chrome)</h3>
              <ol className="hb-step-list">
                <li>Open <span className="hb-kbd-chip">cleancal.net</span> in Chrome.</li>
                <li>
                  Tap <span className="hb-kbd-chip">Install app</span> if Chrome offers it, or open
                  the ⋮ menu and tap <span className="hb-kbd-chip">Add to Home screen</span>.
                </li>
                <li>Confirm on the prompt that appears.</li>
              </ol>
              <div className="hb-callout">
                <strong>Already signed in stays signed in</strong>
                Installing doesn&apos;t start you over — the app opens right back on your
                calendar.
              </div>
            </section>

            <section className="hb-section">
              <span className="hb-kicker">2</span>
              <h2>Sign in</h2>
              <p>
                No password. Enter your email and CleanCal sends a one-time code — tap the link,
                or type the code straight into the page. If the link doesn&apos;t work, that&apos;s
                usually Gmail opening it automatically to scan it first; request a new one and
                type the code in instead.
              </p>
            </section>

            <section className="hb-section">
              <span className="hb-kicker">3</span>
              <h2>Find &amp; claim a job</h2>
              <p>
                On your phone, <strong>Cleaning List</strong> is your day-by-day schedule. You see
                the whole portfolio&apos;s bookings, not just your own, so you can plan around the
                rest of the calendar — but a job that isn&apos;t yours yet shows no guest name or
                details, just an <strong>Assign</strong> checkbox.
              </p>
              <ul>
                <li>
                  <strong>Open job board</strong> — any unassigned job, first to tick the checkbox
                  gets it. Claiming it counts as accepting it right away.
                </li>
                <li>
                  <strong>Directly assigned to you</strong> — you&apos;ll see a Confirm/Decline
                  prompt the moment you open it. You can&apos;t update its checklist until you
                  confirm. Can&apos;t make it after all? Decline, and it goes back to the open
                  board for someone else.
                </li>
              </ul>
              <p>
                <strong>Assigned</strong> lists every job you&apos;ve claimed or confirmed that
                isn&apos;t finished yet; <strong>Completed</strong> lists everything you&apos;ve
                already cleaned.
              </p>
            </section>

            <section className="hb-section">
              <span className="hb-kicker">4</span>
              <h2>Do the clean</h2>
              <p>
                Open the job and work through the checklist room by room — it&apos;s scaled to
                that property&apos;s actual bedroom/bathroom count, with a live done/total count
                per section.
              </p>
              <ul>
                <li>
                  <strong>Oven</strong> has its own <strong>Cleaned</strong> /{" "}
                  <strong>Requires attention</strong> buttons — flag it if it needs real attention,
                  and your host sees a badge on the booking right away.
                </li>
                <li>
                  <strong>Needs attention</strong> (under Notes) is for anything else worth
                  flagging — broken fixture, missing item, whatever — add a quick note and it
                  surfaces the same way.
                </li>
                <li>
                  <strong>Photos</strong> — attach them while you work through the job, useful for
                  proving the clean or flagging pre-existing damage. Tap a thumbnail to see it
                  full-size.
                </li>
              </ul>
              <p>Mark the job complete once you&apos;re done.</p>
            </section>

            <section className="hb-section">
              <span className="hb-kicker">5</span>
              <h2>Get paid</h2>
              <ol className="hb-step-list">
                <li>
                  Verify your identity from <span className="hb-kbd-chip">Menu → My Profile</span>{" "}
                  — a government ID and a live selfie, handled by Stripe. It&apos;s quick, and the
                  result comes back automatically.
                </li>
                <li>
                  Connect your payout account from the same page (&quot;Set up payouts&quot;) — a
                  short Stripe-hosted flow.
                </li>
                <li>
                  Once your host marks a job paid, the money moves to your connected account.
                  Payout status isn&apos;t shown to cleaners in the app yet — check with your
                  Owner or Manager if you&apos;re ever unsure.
                </li>
              </ol>
              <div className="hb-callout warn">
                <strong>Not live yet</strong>
                Payouts aren&apos;t operational yet — this is coming soon. The steps above are
                what it&apos;ll look like once it&apos;s switched on; check with your Owner or
                Manager about getting paid in the meantime.
              </div>
            </section>

            <section className="hb-section">
              <span className="hb-kicker">Need help?</span>
              <h2>Stuck on something?</h2>
              <p>
                The <Link href="/handbook#faq">full Handbook&apos;s FAQ</Link> covers more ground,
                or just email <a href="mailto:support@cleancal.net">support@cleancal.net</a> and
                we&apos;ll sort it out.
              </p>
              <p style={{ marginTop: 20 }}>
                <Link href="/calendar">← Back to Calendar</Link>
              </p>
            </section>
          </div>
          <footer className="hb-footer">
            CleanCal — Cleaner quick guide. Questions?{" "}
            <a href="mailto:support@cleancal.net">support@cleancal.net</a>
          </footer>
        </main>
      </div>
    </div>
  );
}
