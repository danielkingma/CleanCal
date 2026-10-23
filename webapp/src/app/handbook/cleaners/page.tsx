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
                The calendar has <strong>Week</strong>, <strong>Month</strong> and{" "}
                <strong>Year</strong> tabs, plus <strong>Assigned</strong> and{" "}
                <strong>Completed</strong> lists. On your phone, Week is a 7-day grid with every
                property as a row (tap a property&apos;s name to see it in full), and Month shows
                one property at a time — pick it from the dropdown, and tap a day to open it.
                You see the whole portfolio&apos;s bookings, not just your own, so you can plan
                around the rest of the calendar — but a job that isn&apos;t yours yet shows no
                guest name or details, just an <strong>Assign</strong> checkbox. A bar too short
                for a name shows a coloured initial for whoever the job is allocated to, so you
                can tell at a glance if it isn&apos;t yours. Guests&apos; email addresses and phone
                numbers are never shown to cleaners — only your host sees those.
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
                <li>
                  <strong>Auto-assigned</strong> — some hosts turn on automatic job assignment, so
                  a new or shifted booking can land straight in your Assigned list — usually one
                  you&apos;ve cleaned at that property before — with no one having to hand it to
                  you. It behaves exactly like a job your host assigned directly: confirm or
                  decline it the same way. If a booking&apos;s dates move and you&apos;ve marked
                  yourself unavailable for the new date, it&apos;s handed to someone else or
                  posted to the open board instead of staying with you.
                </li>
              </ul>
              <p>
                <strong>Assigned</strong> lists every job you&apos;ve claimed or confirmed that
                isn&apos;t finished yet; <strong>Completed</strong> lists everything you&apos;ve
                already cleaned. Another claimed job you can&apos;t make? Open it and press{" "}
                <strong>Release job</strong> (or <strong>Decline job</strong> if it was assigned
                to you) before you start it, and it goes back on the open board.
              </p>
              <p>
                Tell your Owner or Manager when you can&apos;t work: open{" "}
                <span className="hb-kbd-chip">Menu → Availability</span> and tap the days you
                aren&apos;t available. Everything else is assumed available, and they see a
                warning if they try to give you a job on a day you&apos;ve marked off.
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
                  proving the clean or flagging pre-existing damage. Tap the <strong>+</strong>{" "}
                  to add some, and tap a thumbnail to see it full-size. A photo that looks
                  out of focus gets a <strong>Blurry</strong> badge — retake it or remove it.
                </li>
                <li>
                  <strong>Supplies</strong> — if you use the last of something, open{" "}
                  <span className="hb-kbd-chip">Menu → Supplies</span> and tap{" "}
                  <strong>Used one</strong> next to it so your host knows when to restock.
                </li>
                <li>
                  <strong>Work orders</strong> — repair jobs assigned to you are under{" "}
                  <span className="hb-kbd-chip">Menu → Maintenance</span>. Tap <strong>Start</strong>{" "}
                  when you begin and <strong>Mark done</strong> when you finish.
                </li>
              </ul>
              <p>
                Mark the job <strong>Complete</strong> once you&apos;re done and press Save. You
                need at least one photo, with no blurry ones left, before CleanCal will let you.
                Your time on the job is recorded from when you set it In Progress to when you set
                it Complete, so set those at the real start and finish.
              </p>
              <p>
                Where your host has it switched on, marking a job complete also runs a quick
                automated check of your photos against the basics — bed made, bins emptied,
                surfaces clear. A clean that looks fine just goes through with nothing more for
                you to do. If something looks off, you&apos;ll get a notification and a short note
                on what to double-check — usually while there&apos;s still time to fix it before
                the next guest arrives.
              </p>
              <p>
                Your finished jobs are in <span className="hb-kbd-chip">Menu → History</span>, with
                the rating and note you got for each one.
              </p>
            </section>

            <section className="hb-section">
              <span className="hb-kicker">5</span>
              <h2>Get paid</h2>
              <ol className="hb-step-list">
                <li>
                  Fill in <span className="hb-kbd-chip">Menu → My Profile</span> — your name,
                  phone, service area, address, and a favourite colour (your name and initial show
                  in it, so your jobs are easy to spot). You can also switch on{" "}
                  <span className="hb-kbd-chip">Menu → Enable notifications</span> to get alerts
                  when jobs are posted or assigned to you.
                </li>
                <li>
                  Verify your identity from the same page — a government ID and a live selfie,
                  handled by Stripe. It&apos;s quick, and the result comes back automatically.
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
