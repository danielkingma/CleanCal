"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import DeviceShowcase from "@/components/DeviceShowcase";

// Ported from the standalone claude.ai Handbook artifact into the app
// itself -- that link required viewers to be signed into (and shared
// with) a specific Claude account, which meant cleaners tapping
// "Handbook" from their phone just landed on a generic claude.ai page
// instead of the actual content. This page needs no auth and no
// external sharing settings to work for anyone who opens the app.
export default function HandbookPage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="hb-page">
      <Link href="/calendar" className="hb-back-toggle">
        ← Calendar
      </Link>
      <button
        type="button"
        className="hb-nav-toggle"
        onClick={() => setNavOpen((v) => !v)}
      >
        Menu
      </button>
      <div className="hb-shell">
        <nav className={`hb-sidebar${navOpen ? " open" : ""}`}>
          <div className="hb-side-brand">
            <Logo size={20} />
            Clean<span>Cal</span>
          </div>
          <div className="hb-side-sub">HANDBOOK</div>
          <Link href="/calendar" className="hb-side-back">
            ← Back to Calendar
          </Link>

          <Link href="/handbook/cleaners" className="hb-side-link" style={{ fontWeight: 600 }}>
            🧹 Cleaner quick guide
          </Link>

          <div className="hb-side-group-title">Getting started</div>
          <a className="hb-side-link" href="#welcome">Welcome</a>
          <a className="hb-side-link" href="#signing-in">Signing in &amp; your business</a>
          <a className="hb-side-link" href="#setup-assistant">Setup assistant</a>
          <a className="hb-side-link" href="#roles">Roles at a glance</a>
          <a className="hb-side-link" href="#navigation">Finding your way around</a>

          <div className="hb-side-group-title">Day to day</div>
          <a className="hb-side-link" href="#calendar">The calendar</a>
          <a className="hb-side-link" href="#booking">Opening &amp; editing a booking</a>
          <a className="hb-side-link" href="#sync">Properties &amp; two-way sync</a>
          <a className="hb-side-link" href="#checklist">Cleaning checklist &amp; photos</a>
          <a className="hb-side-link" href="#team">Managing the cleaning team</a>
          <a className="hb-side-link" href="#disputes">Disputes</a>
          <a className="hb-side-link" href="#maintenance">Maintenance &amp; supplies</a>
          <a className="hb-side-link" href="#mobile">Mobile app</a>
          <a className="hb-side-link" href="#notifications">Notifications</a>

          <div className="hb-side-group-title">Your team &amp; account</div>
          <a className="hb-side-link" href="#cleaners-page">The Cleaners page</a>
          <a className="hb-side-link" href="#availability">Availability</a>
          <a className="hb-side-link" href="#history">History</a>
          <a className="hb-side-link" href="#profile">My Profile &amp; devices</a>

          <div className="hb-side-group-title">Insight</div>
          <a className="hb-side-link" href="#dashboard">Dashboard</a>
          <a className="hb-side-link" href="#conflict-spotter">Same-day conflict spotter</a>
          <a className="hb-side-link" href="#dispatcher">Turnover dispatcher</a>
          <a className="hb-side-link" href="#reports">Reports &amp; CSV export</a>

          <div className="hb-side-group-title">Add-on (beta)</div>
          <a className="hb-side-link" href="#statements">Owner statements</a>

          <div className="hb-side-group-title">Trust &amp; money</div>
          <a className="hb-side-link" href="#trust">ID verification &amp; background checks</a>
          <a className="hb-side-link" href="#payments">Cleaner payouts</a>
          <a className="hb-side-link" href="#pricing">Pricing &amp; your free trial</a>

          <div className="hb-side-group-title">Reference</div>
          <a className="hb-side-link" href="#faq">FAQ &amp; troubleshooting</a>
        </nav>

        <main className="hb-main">
          <div className="hb-content">
            <div className="hb-hero">
              <span className="hb-eyebrow">CleanCal Handbook</span>
              <h1>Every turnover, tracked, cleaned, and paid.</h1>
              <p>
                This handbook covers every part of CleanCal — the calendar and booking editor,
                calendar sync, the cleaning checklist and photos, your cleaning team,
                availability, maintenance and supplies, notifications, the dashboard and
                reports, your profile and devices, and trust &amp; payments. Skim the sidebar
                for what you need, or read straight through if you&apos;re setting up for the
                first time.
              </p>
              <p>
                Just here to clean? The <Link href="/handbook/cleaners">cleaner quick guide</Link>{" "}
                covers everything you actually need in a few minutes.
              </p>
              <DeviceShowcase
                monitorSrc="/handbook/calendar-example.png"
                monitorAlt="The CleanCal calendar, month view, open in a desktop browser"
                monitorCaption="On desktop -- the full portfolio calendar."
                phoneSrc="/handbook/app-mobile-example.png"
                phoneAlt="The CleanCal calendar's month view, installed on an Android phone"
                phoneCaption="Installed on a phone -- same calendar, built for one hand."
              />
            </div>

            <section className="hb-section" id="welcome">
              <span className="hb-kicker">Getting started</span>
              <h2>Welcome</h2>
              <p>
                CleanCal is the calendar that runs a short-term rental&apos;s turnovers: it
                knows every booking across every platform you list on, hands the cleaning job —
                with a full room-by-room checklist — to a cleaner on your team, and gives you a
                one-click way to pay them once the job&apos;s done. Three kinds of people use it:
              </p>
              <figure className="landing-video">
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
              <ul>
                <li>
                  <strong>Owners</strong> — run the account. Full access, plus the things nobody
                  else can do: change anyone&apos;s role, delete a property, and set what a
                  cleaner gets paid (the payout rate and any linen fee).
                </li>
                <li>
                  <strong>Managers</strong> — run the day-to-day. Same operational access as an
                  owner, minus role changes, property deletion, and pay-rate changes.
                </li>
                <li>
                  <strong>Cleaners</strong> — see the full portfolio schedule (so they can plan
                  around other jobs), but only full detail on their own assignments and the open
                  job board; manage their own ratings, ID verification, and payout setup.
                </li>
              </ul>
            </section>

            <section className="hb-section" id="signing-in">
              <h2>Signing in &amp; your business</h2>
              <p>
                There&apos;s no password to remember. Enter your email on the sign-in page and
                CleanCal sends a one-time sign-in code — tap the link in that email, or type the
                code straight into the page (useful if your email provider, Gmail especially,
                automatically opens links to scan them, which can burn a one-time link before you
                ever tap it yourself).
              </p>
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
              <p>
                The first time you sign in, you land on a short setup step instead of the
                calendar, since you don&apos;t belong to a business yet:
              </p>
              <ul>
                <li>
                  <strong>Starting your own account</strong> — choose{" "}
                  <strong>An individual</strong> (the account is named after you) or{" "}
                  <strong>A business or company</strong> (enter its name as well as your own),
                  and you become the Owner immediately. You can change the account name
                  whenever you like from Menu → My Profile.
                </li>
                <li>
                  <strong>Joining an existing one</strong> — if someone sent you an invite link,
                  open it and confirm; you&apos;re added with whatever role they set (Cleaner,
                  Manager, or Owner).
                </li>
              </ul>
              <div className="hb-callout">
                <strong>Inviting someone to your team</strong>
                Owners and Managers can generate an invite link from Menu → Invite team.
                Generating one also gives you a ready-to-send message
                with your business name and the link already in it, plus a button that opens your
                email app with that message pre-filled — or just copy the plain link and send it
                however you like (text, WhatsApp, etc.). A Manager can only invite at the Cleaner
                level; only an Owner can invite a Manager. Each link works once. To bring in another business, use{" "}
                <span className="hb-kbd-chip">Menu → Referral</span> (your personal referral link and a
                ready-made message). Referrals are for new businesses only (one that is new to CleanCal and signs up through your link). A business that joins through a referral link gets $20 of welcome credit in its own wallet. When a business you referred starts paying monthly, $20 of CleanCal credit goes
                into your referral wallet. Credit is never paid out as cash and can only be used towards your own
                CleanCal subscription once billing starts.
              </div>
              <p>
                A business&apos;s data is completely separate from every other business on
                CleanCal — nobody outside your team ever sees your properties, bookings, or
                cleaners, and you never see theirs.
              </p>
            </section>

            <section className="hb-section" id="setup-assistant">
              <h2>Setup assistant</h2>
              <p>
                When you create a new business, CleanCal doesn&apos;t drop you onto a blank page.
                A short guided assistant walks you through setting up your first property, in four
                steps:
              </p>
              <ol>
                <li><strong>Name and type</strong> — the property&apos;s name, and whether it&apos;s a house, apartment, cabin/cottage or something else. The type only pre-fills sensible room counts for the next step; nothing else is saved from it.</li>
                <li><strong>Rooms</strong> — bedrooms, bathrooms and whether there&apos;s an outdoor area. Change the suggested numbers to match the real property.</li>
                <li><strong>Checklist preview</strong> — the cleaning checklist your cleaners will see after every stay, built from those room counts (a bedroom and bathroom section per room). Open any section to see its items. Add rooms later and it updates on its own.</li>
                <li><strong>Calendar link</strong> — optional. Paste the calendar (iCal) link from Airbnb, Vrbo, Booking.com or anywhere else so bookings flow straight in, or tap a platform name to label it. You can skip it and add links later from Properties.</li>
              </ol>
              <p>
                It runs once, for people starting a new business. Someone joining an existing
                business with an invite link skips it, because the properties are already set up.
                It&apos;s a set sequence of questions rather than a free-form chat, and everything it
                creates can be changed afterwards under <span className="hb-kbd-chip">Manage →
                Properties</span>.
              </p>
            </section>

            <section className="hb-section" id="roles">
              <h2>Roles at a glance</h2>
              <p>
                Every permission below is enforced on the server, not just hidden in the
                interface — a Cleaner account genuinely cannot reach Manager-level data, even by
                guessing a URL. The two money fields (payout rate and linen fee) are enforced as
                Owner-only in the database itself, not just hidden from a Manager&apos;s screen.
              </p>
              <div className="hb-table-wrap">
                <table>
                  <tbody>
                    <tr>
                      <th>Capability</th>
                      <th><span className="hb-role-chip hb-role-owner">Owner</span></th>
                      <th><span className="hb-role-chip hb-role-manager">Manager</span></th>
                      <th><span className="hb-role-chip hb-role-cleaner">Cleaner</span></th>
                    </tr>
                    <tr>
                      <td>View the full calendar (create/edit is Owner/Manager only)</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="yes">
                        Yes, full detail on own jobs &amp; open board; occupancy only on others&apos;
                      </td>
                    </tr>
                    <tr>
                      <td>Add properties, connect calendar feeds, set a property&apos;s room profile</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Delete a property</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>See a guest&apos;s email, phone and notes (direct bookings)</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Owner statements, client fees, payout imports (add-on)</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Assign or rate cleaners, resolve disputes</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Change anyone&apos;s role</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Set a property&apos;s payout rate or linen fee</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Pay a completed job (at whatever rate is already set)</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Invite a new Cleaner</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Invite a new Manager</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>View Dashboard &amp; Reports (CSV export)</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Remove, restore or delete a cleaner&apos;s account</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Create work orders &amp; maintenance schedules, restock supplies</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Update a work order assigned to you, report a supply &quot;Used one&quot;</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                    </tr>
                    <tr>
                      <td>Mark your own days unavailable, view History, edit My Profile</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                    </tr>
                    <tr>
                      <td>Clients &amp; fees and platform Payouts (owner statements add-on, when enabled)</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                    </tr>
                    <tr>
                      <td>Set the business name</td>
                      <td className="yes">Yes</td>
                      <td className="no">—</td>
                      <td className="no">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Handing someone the Manager role means handing over the business&apos;s
                day-to-day — without handing over who&apos;s in charge, or what anyone gets paid.
              </p>
            </section>

            <section className="hb-section" id="navigation">
              <h2>Finding your way around</h2>
              <p>Every signed-in page has the same two dropdowns in its top bar, so you can jump anywhere without going back to the calendar first:</p>
              <ul>
                <li>
                  <strong>Manage</strong> (Owner/Manager only) —{" "}
                  <a href="#dashboard">Dashboard</a>, <a href="#reports">Reports</a>,{" "}
                  <a href="#sync">Properties</a>, <a href="#cleaners-page">Cleaners</a>,{" "}
                  <a href="#maintenance">Maintenance</a> and <a href="#maintenance">Supplies</a>
                  — plus <a href="#statements">Clients &amp; fees</a>,{" "}
                  <a href="#statements">Payouts</a> and{" "}
                  <a href="#statements">Owner statements</a> if the owner statements add-on is
                  switched on for your account.
                </li>
                <li>
                  <strong>Menu</strong> (everyone) — this Handbook, the{" "}
                  <Link href="/handbook/cleaners">Cleaner quick guide</Link>,{" "}
                  <a href="#history">History</a>, <a href="#availability">Availability</a>,
                  Maintenance, Supplies, <a href="#profile">My Profile</a>, the notifications
                  toggle (see <a href="#notifications">Notifications</a>), and{" "}
                  <strong>Contact support</strong>, which opens an email to{" "}
                  <a href="mailto:support@cleancal.net">support@cleancal.net</a>.
                </li>
              </ul>
              <p>
                Every page except the calendar also has a <strong>← Calendar</strong> button in
                the top right to take you back, and a <strong>Sign out</strong> button in the
                top bar.
              </p>
            </section>

            <section className="hb-section" id="calendar">
              <span className="hb-kicker">Day to day</span>
              <h2>The calendar</h2>
              <p>
                Along the top bar, the <strong>‹ ›</strong> arrows step to the previous or next
                period, the label in between says which period you&apos;re looking at, and{" "}
                <strong>Today</strong> jumps back to now. Owners and Managers also get a{" "}
                <strong>+ New booking</strong> button. Three views are switched from the top bar:
              </p>
              <ul>
                <li>
                  <strong>Week / Month</strong> — every property as a row, bookings as colored
                  bars. <span style={{ color: "var(--amber)", fontWeight: 600 }}>Amber</span>{" "}
                  means to clean,{" "}
                  <span style={{ color: "var(--blue)", fontWeight: 600 }}>blue</span> means in
                  progress,{" "}
                  <span style={{ color: "var(--teal-deep)", fontWeight: 600 }}>teal</span> means
                  complete. A small red badge on a bar means <strong>Requires attention</strong> —
                  either the oven check on that booking&apos;s checklist was marked that way, or a
                  cleaner ticked the general &quot;Needs attention&quot; box under Notes (see{" "}
                  <a href="#checklist">Cleaning checklist &amp; photos</a>).
                </li>
                <li>
                  <strong>Year</strong> — pick one property from the dropdown for a full 12-month
                  view of just that listing, guest names on each stay.
                </li>
              </ul>
              <p>
                On a phone, the same three tabs are there, laid out to fit a narrow screen:
              </p>
              <ul>
                <li>
                  <strong>Week</strong> — a 7-day grid with every property as a row. The property
                  column is kept narrow to leave room for the days; tap a property&apos;s name
                  to see it in full (the same works on desktop if a long name is cut off).
                </li>
                <li>
                  <strong>Month</strong> — a compact month grid for one property at a time; pick
                  the property from the dropdown in the top bar. Tap a day to open it — if
                  more than one clean falls on that day (a same-day turnover), you get a short
                  list to choose from, so you never have to hit two overlapping slivers
                  precisely.
                </li>
                <li>
                  <strong>Year</strong> — a stack of twelve mini-months for the property picked
                  in the dropdown.
                </li>
              </ul>
              <p>
                Both roles, on desktop and phone, also have <strong>Assigned</strong> and{" "}
                <strong>Completed</strong>, set apart from Week/Month/Year in their own pill
                group since they&apos;re worklists rather than calendar views. They&apos;re a
                scrollable day-by-day agenda of cards, paginated by month. For a cleaner,
                Assigned lists every job they&apos;ve actually claimed or confirmed that
                isn&apos;t finished yet, and Completed lists everything they&apos;ve already
                cleaned. For an Owner/Manager, both list every booking in the portfolio in that
                state regardless of who&apos;s on it, naming the cleaner on each card — in that
                cleaner&apos;s own favourite colour (see <a href="#profile">My Profile</a>), so
                you can pick out one person&apos;s jobs at a glance.
              </p>
              <p>
                A bar always starts a little into its check-in day and ends a little into its
                checkout day — 2pm check-in, 10am checkout — so a same-day turnover reads
                correctly instead of looking like a gap or a double-booking.
              </p>
              <p>Click any bar to open it. Click empty space on the calendar to start a new booking (Owner/Manager only).</p>
              <p>
                A cleaner sees this same calendar across every property, not just their own jobs —
                useful for planning around the rest of the schedule. Their own assigned bars get a
                teal outline; a small teal &quot;?&quot; badge means a directly-assigned job is
                still waiting on their confirmation (see{" "}
                <a href="#team">Managing the cleaning team</a>). A job that isn&apos;t confirmed as
                theirs — whether no cleaner has been picked yet or an Owner/Manager already
                suggested someone else — shows no guest name, status, or platform badge at all,
                just an <strong>Assign</strong> checkbox: ticking it claims the job for that
                cleaner immediately, the same as claiming one off the open job board.
              </p>
              <p>
                An Owner/Manager sees every booking&apos;s real status and platform badge, and on
                any job that has a cleaner on it (confirmed or not) — a small 🧹 mark plus that
                cleaner&apos;s name, right on the bar, on Week, Month, and Year alike. Nothing shows
                a generic &quot;Reserved&quot; label anymore, and a platform&apos;s name only ever
                appears once per booking.
              </p>
              <p>
                A bar can be too short to fit a full name. When that happens — and always on the
                phone&apos;s Month grid — the cleaner&apos;s <strong>initial</strong> is shown
                instead of cutting the name off mid-word, tinted in their favourite colour. Cleaners
                see this too: on the shared schedule they can see the initial and colour of whoever
                is allocated to each booking (and nothing else about that person), so nobody turns
                up to a job that isn&apos;t theirs.
              </p>
              <figure className="hb-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/handbook/calendar-example.png"
                  alt="Month view of the CleanCal calendar showing twelve properties as rows, with colored booking bars for each cleaning status, a small circular platform badge on each bar (A for Airbnb, V for Vrbo, B for Booking.com, and so on), and a red &quot;!&quot; marker on one bar showing it requires attention."
                />
                <figcaption>
                  Month view with a full portfolio of properties. Each bar&apos;s color is the
                  cleaning status; the small circular badge is which platform the booking came
                  from; the red &quot;!&quot; on The Fitzroy Nook&apos;s booking means it needs
                  attention.
                </figcaption>
              </figure>
            </section>

            <section className="hb-section" id="booking">
              <h2>Opening &amp; editing a booking</h2>
              <p>
                Click or tap any bar (or card) to open its booking. Owners and Managers can also
                start a blank one with <strong>+ New booking</strong>, or by clicking empty space
                on the calendar. What you can change depends on your role.
              </p>
              <h3>For Owners &amp; Managers</h3>
              <ul>
                <li>
                  <strong>Property, Guest/s, Booking platform</strong> — the platform field
                  suggests Airbnb, Vrbo, Booking.com, Expedia and Direct, but you can type any
                  name. It decides the colored badge on the bar.
                </li>
                <li>
                  <strong>Direct bookings &amp; guest contact</strong> — taking a booking without a
                  platform? Enter it with + New booking, set the platform to{" "}
                  <em>Direct</em>, and fill in the guest&apos;s <strong>email</strong>,{" "}
                  <strong>phone</strong> and <strong>guest notes</strong>. These are visible to
                  Owners and Managers only; cleaners see just the guest name once a job is theirs,
                  and the details never go out in the calendar link.
                </li>
                <li>
                  <strong>Check-in, Checkout, Nights</strong> — the three are linked: change any
                  one and the others follow. A booking can be 1 to 12 months.
                </li>
                <li>
                  <strong>Assignment</strong> — <em>Reserved for a cleaner</em> (pick them in{" "}
                  <strong>Assigned cleaner</strong>, which shows each cleaner&apos;s average
                  rating) or <em>Open — any cleaner can claim</em>, which posts it to the open
                  job board. See <a href="#team">Managing the cleaning team</a>. If the cleaner
                  you pick marked themselves unavailable on the clean date, a warning says so
                  right there (see <a href="#availability">Availability</a>).
                </li>
                <li>
                  <strong>Cleaner takes linen off-site to clean</strong> — tick this on a booking
                  whose linen needs picking up; it shows exactly how much it adds to the payout
                  (see <a href="#payments">Cleaner payouts</a>).
                </li>
                <li>
                  <strong>Cleaning status</strong> — To Clean, In Progress, or Complete.
                </li>
                <li>
                  <strong>Notes</strong> and the general <strong>Needs attention</strong> box —
                  see <a href="#checklist">Cleaning checklist &amp; photos</a>.
                </li>
                <li>
                  Further down: the checklist and photos, a <strong>Rate this cleaning</strong>{" "}
                  section (once it&apos;s complete and has a cleaner), the{" "}
                  <strong>Cleaner payout</strong> section, and the <strong>Dispute</strong>{" "}
                  thread.
                </li>
                <li>
                  <strong>Delete</strong> removes the booking for good. A booking that came in
                  from a calendar feed and later disappears from it is removed automatically (see
                  the FAQ).
                </li>
              </ul>
              <p>
                The property&apos;s <strong>access instructions</strong> (door code, parking,
                wifi — whatever you saved on the Properties page) appear in the booking so a
                cleaner sees them without asking.
              </p>
              <h3>For cleaners</h3>
              <p>
                You can see the booking&apos;s dates, notes and access instructions, and you
                work the checklist, photos and status on jobs that are yours. Depending on the
                job, the buttons at the bottom are:
              </p>
              <ul>
                <li><strong>Claim this job</strong> — for a job on the open board or one with no cleaner confirmed.</li>
                <li><strong>Confirm</strong> / <strong>Decline</strong> — on a job an Owner or Manager assigned directly to you.</li>
                <li><strong>Decline job</strong> — hands a job back before you&apos;ve started it.</li>
                <li><strong>Release job</strong> — puts a job you claimed back on the open board.</li>
                <li><strong>Save</strong> — saves your status and checklist.</li>
              </ul>
              <div className="hb-callout">
                <strong>Marking a job complete</strong>
                A cleaner has to attach <strong>at least one photo</strong> first, and any photo
                CleanCal thinks is blurry has to be retaken — otherwise the save is refused with a
                message saying so. Owners and Managers aren&apos;t held to this when they update a
                booking themselves.
              </div>
              <p>
                Cleaning time is recorded for you: the first time a cleaner sets their own job to{" "}
                <strong>In Progress</strong> and the first time they set it to{" "}
                <strong>Complete</strong>, CleanCal notes the moment, and the gap is the time the
                clean took. That&apos;s what the{" "}
                <a href="#reports">Reports</a> page uses for average cleaning time. Jobs finished
                before this existed, or completed by an Owner/Manager on someone&apos;s behalf,
                have no time recorded.
              </p>
            </section>

            <section className="hb-section" id="sync">
              <h2>Properties &amp; two-way sync</h2>
              <p>Open <span className="hb-kbd-chip">Manage → Properties</span> from the calendar&apos;s top bar to manage each listing.</p>
              <div className="hb-callout">
                <strong>Does CleanCal connect to my property management system (PMS)?</strong>
                Not directly. CleanCal works from calendar (iCal) links: paste each
                property&apos;s calendar link from Airbnb, Vrbo, Booking.com, your own website or
                any PMS that can export one, and the bookings appear here — and CleanCal gives
                you its own link to paste back out so other calendars stay in step. If your PMS
                can give you a calendar link, it works alongside it.
              </div>
              <h3>Adding and finding properties</h3>
              <p>
                Type a name under <strong>Add a property</strong> and press{" "}
                <span className="hb-kbd-chip">Add property</span>. Each property is a collapsed
                row showing its name and how many calendar feeds it has (a red{" "}
                <strong>Sync error</strong> pill appears on the row if any feed is failing) — tap
                a row to open all of its settings. <span className="hb-kbd-chip">Sync all feeds</span>{" "}
                at the top syncs every property in one go and tells you how many succeeded.
              </p>
              <h3>Access instructions</h3>
              <p>
                Inside each property, <strong>Access instructions</strong> is where you put the
                door code, parking, wifi — anything a cleaner needs to get in and get started.
                It&apos;s shown to cleaners on that property&apos;s bookings.
              </p>
              <h3>Bringing bookings in</h3>
              <ol className="hb-step-list">
                <li>On your OTA (Airbnb, Vrbo, Booking.com, or any other), find its calendar export link — usually under Calendar → Export or Sync.</li>
                <li>Paste it into the property&apos;s <span className="hb-kbd-chip">Add feed</span> field with a label, e.g. &quot;Airbnb&quot;.</li>
                <li>Click <span className="hb-kbd-chip">Sync now</span>, or leave it — feeds sync automatically on a schedule if that&apos;s configured for your account.</li>
              </ol>
              <p>
                Each feed shows a status pill — <strong>Never synced</strong>, <strong>OK</strong>{" "}
                or a red <strong>Error</strong> with the reason underneath — plus buttons to{" "}
                <span className="hb-kbd-chip">Sync now</span> or <span className="hb-kbd-chip">Remove</span>{" "}
                it. A property can have as many feeds as it needs (Airbnb, Vrbo, your own
                website…). A property with no feeds simply takes bookings you enter by hand.
                Re-syncing updates a reservation&apos;s dates rather than duplicating it, and
                never touches its cleaning status, checklist or assigned cleaner.
              </p>
              <h3>Sending your calendar back out</h3>
              <p>
                Every property also has its own <strong>Calendar export</strong> link. Paste that
                one into each OTA&apos;s &quot;connect to another website&quot; or &quot;import
                calendar&quot; field. This is what actually prevents double-bookings: without it,
                a booking made on Vrbo never tells Airbnb the date&apos;s taken.
              </p>
              <div className="hb-callout warn">
                <strong>If a link leaks or you&apos;re changing platforms</strong>
                Use &quot;Regenerate link&quot; next to the export URL. The old link stops working
                immediately — you&apos;ll need to paste the new one back into every OTA that had
                it.
              </div>
              <h3>Property profile</h3>
              <p>
                Each property also has a profile — bedroom count, bathroom count, and whether it
                has an outdoor area — set right on this page, next to access instructions. This
                is what the cleaning checklist uses to scale itself to the actual property; see{" "}
                <a href="#checklist">Cleaning checklist &amp; photos</a> below. Any property
                that&apos;s never had this set defaults to 1 bedroom, 1 bathroom, no outdoor area.
              </p>
              <h3>Pay settings and deleting a property</h3>
              <p>
                The same page holds each property&apos;s <strong>payout rate</strong> and{" "}
                <strong>linen service</strong> (boxes and fee per box) — Owner-only; a Manager
                sees the figures but can&apos;t change them (see{" "}
                <a href="#payments">Cleaner payouts</a>). Only an Owner sees{" "}
                <span className="hb-kbd-chip">Delete property</span>, which permanently deletes the
                property along with every booking, photo and calendar feed on it, after a
                confirmation. It can&apos;t be undone.
              </p>
            </section>

            <section className="hb-section" id="checklist">
              <h2>Cleaning checklist &amp; photos</h2>
              <p>
                Every booking carries a full, room-by-room cleaning checklist, modeled on a real
                professional turnover checklist rather than a handful of generic line items:
                Bedrooms, Bathrooms, Kitchen, Dining/Living Room, Floors &amp; Carpets, Outdoor
                Areas (if the property has one), and Locking Up. Each section is collapsible with
                a live <code>done/total</code> count, so a cleaner works through one room at a
                time on their phone instead of scrolling one long list.
              </p>
              <p>
                The checklist scales to each property&apos;s own profile (set on the Properties
                page — see above): a property with 3 bedrooms gets three separate Bedroom
                sections to track independently (&quot;Bedroom 1,&quot; &quot;Bedroom 2,&quot;
                &quot;Bedroom 3&quot;), same for bathrooms, and the Outdoor Areas section only
                appears if the property actually has an outdoor area.
              </p>
              <p>
                The oven is the one item worth a heads-up if it needs real attention: instead of a
                plain checkbox, it has <strong>Cleaned</strong> and{" "}
                <strong>Requires attention</strong> buttons. Marking it &quot;Requires
                attention&quot; puts a red &quot;!&quot; badge on that booking right on the
                calendar, visible to Owners and Managers at a glance.
              </p>
              <p>
                For anything else worth flagging — not specific to one checklist item — there&apos;s
                a general <strong>Needs attention</strong> checkbox right under the booking&apos;s
                Notes field. Ticking it opens a text box for a quick note (e.g. &quot;broken lamp
                in bedroom&quot;), and puts that same red &quot;!&quot; badge on the booking so
                the host sees it without having to open every job.
              </p>
              <h3>Photos</h3>
              <p>
                A cleaner can attach photos to a booking while working through it — useful for
                proving a clean&apos;s condition or flagging pre-existing damage. Click or tap any
                photo to see it full-size: on desktop, just hover over the thumbnail; on a phone
                (no hover), tap it to open a large view, tap again (or the ✕) to close.
              </p>
              <p>
                Tap the <strong>+</strong> tile to add photos (you can pick several at once), and
                the small ✕ on a thumbnail removes one. CleanCal checks each photo as it&apos;s
                uploaded, and one that looks out of focus gets a <strong>Blurry</strong> badge.
                A cleaner needs <strong>at least one photo</strong>, with no blurry ones left,
                before the job can be marked complete — retake any that are flagged and remove the
                bad ones.
              </p>
              <p>
                Where it&apos;s turned on, marking a job complete also triggers an automated photo
                review: the photos get a quick AI check against the basics a guest would notice —
                bed made, bins emptied, surfaces clear, nothing left behind. A clean that looks fine
                passes through with nothing extra to do. One that doesn&apos;t gets the same red
                &quot;!&quot; badge as the Needs attention checkbox above, with a short note on
                what looked off, and the cleaner gets a push notification right away — while
                there&apos;s usually still time to go back and fix it before the next guest
                arrives.
              </p>
            </section>

            <section className="hb-section" id="team">
              <h2>Managing the cleaning team</h2>
              <p>
                Assign a booking to a specific cleaner, or mark it <strong>Open</strong> so any
                cleaner on your team can claim it first-come, first-served — claiming is atomic,
                so two cleaners can never grab the same job. Claiming an open job counts as
                accepting it immediately, but a job you assign directly to a specific cleaner
                doesn&apos;t count as accepted until they actively confirm it — they see a
                Confirm/Decline prompt the moment they open it, and can&apos;t update its checklist
                or status until they confirm. Declining (whether pending or already confirmed,
                any time before the job&apos;s started) puts it back on the open board for someone
                else. A cleaner who can&apos;t make an already-confirmed job anymore can release it
                back to the pool the same way.
              </p>
              <p>
                Picking a cleaner in the assignment dropdown is a starting suggestion, not an
                exclusive lock: every other cleaner still sees that job as unassigned on their
                calendar, with a checkbox that claims it immediately — first to tick it gets it,
                same as the open job board. If the wrong cleaner ends up on a job, or you just
                want to swap who&apos;s doing it, the <strong>Assigned cleaner</strong> dropdown in
                the booking editor works at any time, on any booking, claimed or not — pick someone
                else and save to reassign it directly, no approval step either way.
              </p>
              <p>
                Every completed job gets a 1–5 star rating with an optional note. Ratings roll up
                into each cleaner&apos;s profile average, visible right in the assignment
                dropdown and on the <a href="#cleaners-page">Cleaners page</a> — so you&apos;re
                never assigning blind. To rate one, open the completed booking and use{" "}
                <strong>Rate this cleaning</strong> (Owner/Manager only); the cleaner is
                notified, and a rating of 2★ or lower also raises a re-clean work order (see{" "}
                <a href="#maintenance">Maintenance &amp; supplies</a>).
              </p>
            </section>

            <section className="hb-section" id="disputes">
              <h2>Disputes</h2>
              <p>
                Either side — Owner/Manager or the assigned cleaner — can flag an issue on a
                booking: property condition, a payment disagreement, anything. It opens a
                threaded conversation attached to that booking, visible to both sides and no one
                else. Posting a reply reopens the thread even if it was marked resolved, so
                nothing quietly gets buried.
              </p>
              <p>
                Find it in the <strong>Dispute</strong> section at the bottom of the booking:
                type your message and press <span className="hb-kbd-chip">Post</span>. Each
                message shows who wrote it, whether they&apos;re an Owner, Manager or cleaner, and
                when. An Owner/Manager can press <span className="hb-kbd-chip">Mark resolved</span>{" "}
                once it&apos;s sorted. Open and resolved disputes show as a small pill on the
                booking and in <a href="#history">History</a> and{" "}
                <a href="#reports">Reports</a>, and open ones are listed on the{" "}
                <a href="#dashboard">Dashboard</a>.
              </p>
            </section>

            <section className="hb-section" id="maintenance">
              <h2>Maintenance &amp; supplies</h2>
              <p>
                Two things that live outside the cleaning calendar entirely, both under{" "}
                <strong>Menu</strong> (or <strong>Manage</strong>, for Owners/Managers).
              </p>
              <h3>Work orders</h3>
              <p>
                A standalone task on a property — a broken dishwasher, a squeaky door — that
                isn&apos;t tied to any specific cleaning booking. Owners/Managers create one with a
                title, description, priority (Normal or Urgent), an optional due date, and
                optionally assign it to a cleaner; a cleaner sees anything assigned to them and
                can move it between <strong>In progress</strong> and <strong>Done</strong>{" "}
                themselves, without needing to go through staff.
              </p>
              <p>
                Open work orders are listed with a tag for where they came from —{" "}
                <strong>Manual</strong> (someone created it), <strong>Low rating</strong> (raised
                automatically from a poor rating) or <strong>Preventative</strong> (raised from a
                recurring schedule) — plus an Urgent tag where it applies, who it&apos;s assigned
                to, and the due date. Owners/Managers get <strong>Mark in progress</strong>,{" "}
                <strong>Mark done</strong> and <strong>Delete</strong> on each; a cleaner gets{" "}
                <strong>Start</strong> and <strong>Mark done</strong> on their own. Finished work
                orders drop into a <strong>Done</strong> list with the date they were completed.
                A cleaner is notified when a work order is assigned to them.
              </p>
              <p>
                A rating of 2★ or lower on a booking automatically creates an <strong>urgent</strong>{" "}
                work order for a re-clean and notifies Owners/Managers — nothing to remember to do
                by hand.
              </p>
              <h3>Preventative maintenance</h3>
              <p>
                A recurring task per property — &quot;replace HVAC filter every 90 days,&quot; say —
                independent of any booking. Once it goes overdue, a work order gets created for it
                automatically (checked once a day); completing that work order rolls the schedule&apos;s
                due date forward on its own. Owners/Managers can also mark one done directly, or spin
                up its work order early without waiting for it to go overdue.
              </p>
              <p>
                To set one up, go to <strong>Preventative maintenance</strong> at the bottom of
                the Maintenance page (Owner/Manager only), choose the property, how many days
                apart it repeats (<strong>Every (days)</strong>) and a title, then press{" "}
                <span className="hb-kbd-chip">Add schedule</span>. Each schedule shows{" "}
                <strong>Due in N days</strong> or, in red, <strong>Overdue by N days</strong>,
                with <span className="hb-kbd-chip">Mark done now</span>,{" "}
                <span className="hb-kbd-chip">Create work order</span> and{" "}
                <span className="hb-kbd-chip">Delete</span> buttons. When a schedule goes overdue,
                Owners/Managers are notified.
              </p>
              <h3>Supplies</h3>
              <p>
                A running list of consumables per property — toilet paper, coffee, soap, whatever
                you stock — each with a quantity and a &quot;low at or below&quot; threshold.
                Anyone, staff or a cleaner on the job, can tap <strong>Used one</strong> to report
                using an item up; the count can only ever go down this way, never up, so it&apos;s
                safe for anyone to tap. Once an item crosses its low-stock line, Owners/Managers get
                notified automatically. Restocking — setting the count back up once you&apos;ve
                actually bought more — is an Owner/Manager action, kept deliberately separate from
                usage reports so the two can never be mixed up.
              </p>
              <p>
                To add an item, an Owner/Manager fills in <strong>Add a supply item</strong> at the
                top of the Supplies page: property, item name, unit (rolls, bottles, bags…),
                starting quantity, and <strong>Flag as low at or below</strong>. The list is
                grouped by property, with a red &quot;low&quot; tag on anything at or under its
                line and a count of how many items are running low in the heading. Each item has{" "}
                <span className="hb-kbd-chip">Used one</span> for everyone, and for
                Owners/Managers a <strong>Restock to…</strong> box with a{" "}
                <span className="hb-kbd-chip">Restock</span> button, plus{" "}
                <span className="hb-kbd-chip">Remove</span>.
              </p>
              <div className="hb-callout">
                <strong>No automatic reordering yet</strong>
                Restocking is you telling CleanCal you bought more — it doesn&apos;t place a real
                order with a supplier on its own. That would need a supplier with an API to order
                against first.
              </div>
            </section>

            <section className="hb-section" id="mobile">
              <h2>Mobile app</h2>
              <p>
                CleanCal isn&apos;t in the App Store or Google Play — it installs straight from
                your phone&apos;s browser instead, as a Progressive Web App (PWA). That means one
                fewer download to manage and updates that land instantly, with no app-store review
                to wait on. Once installed, it looks and behaves like any other app: its own
                home-screen icon, its own app-switcher entry, and a full-screen window with no
                browser address bar.
              </p>
              <h3>Installing on iPhone (Safari)</h3>
              <ol className="hb-step-list">
                <li>Open <span className="hb-kbd-chip">cleancal.net</span> in Safari — the install prompt only appears in Safari, not Chrome or another browser on iOS.</li>
                <li>Tap the Share icon (the square with an arrow pointing up) in the bottom toolbar.</li>
                <li>Scroll down and tap <span className="hb-kbd-chip">Add to Home Screen</span>.</li>
                <li>Tap <span className="hb-kbd-chip">Add</span> in the top-right corner — the CleanCal icon appears on your home screen right away.</li>
              </ol>
              <h3>Installing on Android (Chrome)</h3>
              <ol className="hb-step-list">
                <li>Open <span className="hb-kbd-chip">cleancal.net</span> in Chrome.</li>
                <li>
                  Tap <span className="hb-kbd-chip">Install app</span> if Chrome offers it directly
                  (usually as a banner or an icon in the address bar) — otherwise open the ⋮ menu
                  in the top-right and tap <span className="hb-kbd-chip">Add to Home screen</span>{" "}
                  or <span className="hb-kbd-chip">Install app</span>.
                </li>
                <li>Confirm by tapping <span className="hb-kbd-chip">Install</span> (or <span className="hb-kbd-chip">Add</span>) on the prompt that appears.</li>
              </ol>
              <div className="hb-callout">
                <strong>Already signed in stays signed in</strong>
                Installing doesn&apos;t start you over — open the installed icon and you&apos;ll
                land right back on your calendar, still signed in from the browser.
              </div>
              <p>
                New accounts are also shown these install steps right after signing up. For the
                alerts that make the installed app worth having, see{" "}
                <a href="#notifications">Notifications</a> below.
              </p>
            </section>

            <section className="hb-section" id="notifications">
              <h2>Notifications</h2>
              <p>
                From <strong>Menu → Enable notifications</strong>, CleanCal can push an alert
                straight to your phone or computer (the same item turns them off again). Turn it
                on from inside the installed app for the most reliable delivery. If your browser
                has blocked notifications for CleanCal, re-allow them in the browser&apos;s site
                settings first. If your phone number is saved in{" "}
                <a href="#profile">My Profile</a> and text alerts are switched on for the
                platform, you can also tick a box there to get the same alerts by SMS.
              </p>
              <div className="hb-table-wrap">
                <table>
                  <tbody>
                    <tr>
                      <th>Alert</th>
                      <th>Who gets it</th>
                    </tr>
                    <tr>
                      <td><strong>New open job posted</strong> — a booking is posted to the open board</td>
                      <td>Every active cleaner</td>
                    </tr>
                    <tr>
                      <td><strong>New job assigned to you</strong></td>
                      <td>The cleaner it&apos;s assigned to</td>
                    </tr>
                    <tr>
                      <td><strong>Job confirmed</strong>, <strong>Job declined</strong>, <strong>A job was claimed</strong></td>
                      <td>Owners &amp; Managers</td>
                    </tr>
                    <tr>
                      <td><strong>Jobs back on the open board</strong> — a cleaner was removed from the team and had upcoming jobs</td>
                      <td>The remaining cleaners</td>
                    </tr>
                    <tr>
                      <td><strong>You got a new rating</strong></td>
                      <td>The cleaner who was rated</td>
                    </tr>
                    <tr>
                      <td><strong>Re-clean flagged</strong> — a rating of 2★ or lower</td>
                      <td>Owners &amp; Managers</td>
                    </tr>
                    <tr>
                      <td><strong>New dispute message</strong></td>
                      <td>Owners &amp; Managers when a cleaner posts; the assigned cleaner when staff post</td>
                    </tr>
                    <tr>
                      <td><strong>A booking was removed</strong> — it disappeared from its source calendar</td>
                      <td>Owners &amp; Managers, and whoever was assigned to it</td>
                    </tr>
                    <tr>
                      <td><strong>New work order assigned to you</strong></td>
                      <td>The cleaner it&apos;s assigned to</td>
                    </tr>
                    <tr>
                      <td><strong>Maintenance due</strong> — a preventative schedule went overdue</td>
                      <td>Owners &amp; Managers</td>
                    </tr>
                    <tr>
                      <td><strong>Supply running low</strong></td>
                      <td>Owners &amp; Managers</td>
                    </tr>
                    <tr>
                      <td><strong>Signed in on a new device</strong></td>
                      <td>The account that signed in (see <a href="#profile">My Profile</a>)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="hb-section" id="cleaners-page">
              <span className="hb-kicker">Your team &amp; account</span>
              <h2>The Cleaners page</h2>
              <p>
                <span className="hb-kbd-chip">Manage → Cleaners</span> (Owner/Manager) is the
                home for your team. From top to bottom:
              </p>
              <ul>
                <li>
                  <strong>Invite someone to your team</strong> (now on its own page,{" "}
                  <span className="hb-kbd-chip">Menu → Invite team</span>) — pick a role, press{" "}
                  <span className="hb-kbd-chip">Generate invite link</span>, then copy the link, or
                  copy the ready-made message, or press <strong>Open in email</strong>. Managers
                  can only invite Cleaners; Owners can also invite Managers. Each link
                  works once. (More under <a href="#signing-in">Signing in &amp; your business</a>.)
                </li>
                <li>
                  <strong>Team roles</strong> (Owner only) — everyone on the account with their
                  email address, and a dropdown to change their role to Owner, Manager or
                  Cleaner. You can&apos;t change your own role, so you can&apos;t lock yourself
                  out.
                </li>
                <li>
                  <strong>One card per cleaner</strong> — each is a collapsed row (name and rating); tap it to open. Inside: name (with their favourite-colour dot),
                  the email address (Owner only), an <strong>ID verified / ID pending / ID not
                  verified</strong> badge, a <strong>Payouts set up / pending / not set up</strong>{" "}
                  badge, their average rating and how many ratings that&apos;s from, their phone and
                  service area, their bio, and the next few days they&apos;ve marked themselves
                  unavailable (see <a href="#availability">Availability</a>).
                </li>
              </ul>
              <h3>Removing a cleaner</h3>
              <p>
                An Owner can press <span className="hb-kbd-chip">Remove from team</span> on a
                cleaner&apos;s card. They&apos;re signed out and can&apos;t sign back in, and any
                of their upcoming, not-yet-complete jobs go back on the open board (the other
                cleaners are notified). Their past bookings, ratings and payout history are kept.
              </p>
              <p>
                Removed cleaners move to a <strong>Removed cleaners</strong> list at the bottom
                with the date, where an Owner can either{" "}
                <span className="hb-kbd-chip">Restore access</span> or, as a deliberate second
                step, <span className="hb-kbd-chip">Delete</span> — permanently deleting their
                account after typing <strong>DELETE</strong> to confirm. A deleted account
                can&apos;t be brought back; their past bookings, ratings and payout history stay on
                record, just no longer linked to a named account.
              </p>
            </section>

            <section className="hb-section" id="availability">
              <h2>Availability</h2>
              <p>
                <span className="hb-kbd-chip">Menu → Availability</span> is a calendar where you
                mark days you can&apos;t work. Everything is assumed available unless you say
                otherwise: click or tap a day to mark yourself <strong>unavailable</strong> (it
                turns coral), and click it again to clear it. Use ‹ › to move between months.
                Past days can&apos;t be changed, and each change saves as you click.
              </p>
              <p>
                Owners and Managers see your upcoming unavailable days on the{" "}
                <a href="#cleaners-page">Cleaners page</a>, and if a booking is assigned to a
                cleaner who has marked its clean date as unavailable, the booking editor shows a
                warning. It&apos;s a heads-up, not a block — you can still assign them. Anyone can use
                the page, including Owners and Managers, but it only ever affects your own dates.
              </p>
            </section>

            <section className="hb-section" id="history">
              <h2>History</h2>
              <p>
                <span className="hb-kbd-chip">Menu → History</span> lists every{" "}
                <strong>completed</strong> clean, newest first, with a count and the average
                rating at the top. Each row shows the property, guest(s), check-in date, nights,
                the source platform, the rating and any note, and a dispute pill if there was
                one. For a cleaner this is <em>their own</em> completed jobs; for an
                Owner/Manager it&apos;s the whole portfolio, with a Cleaner column showing who
                did each one. (For filtering by date, property or cleaner and for exporting,
                see <a href="#reports">Reports</a>.)
              </p>
            </section>

            <section className="hb-section" id="profile">
              <h2>My Profile &amp; devices</h2>
              <p>
                <span className="hb-kbd-chip">Menu → My Profile</span> holds your details. Press{" "}
                <strong>Save</strong> after changing them.
              </p>
              <ul>
                <li><strong>Email</strong> — shown for reference (it&apos;s what you sign in with).</li>
                <li>
                  <strong>Given name, Middle name (optional), Surname</strong> — what your team
                  sees.
                </li>
                <li>
                  <strong>Preferred initial</strong> (cleaners) — when a booking bar is too short
                  for your full name, your initial is shown instead. It&apos;s made from one letter
                  of each name you&apos;ve filled in, and the page previews it as you type.
                </li>
                <li>
                  <strong>Favourite colour</strong> (cleaners) — pick one of ten light shades.
                  Your name and initial appear in it in the Assigned and Completed lists and on
                  the calendar, so your jobs are easy to pick out. Only lighter shades are offered
                  so it stays readable on the calendar&apos;s booking colours.
                </li>
                <li>
                  <strong>Phone</strong> and <strong>Service area</strong> — so admins can reach
                  you and know where you work. When text alerts are available on the platform, an
                  extra <strong>Also text me booking/job alerts</strong> tick-box appears under
                  Phone (standard SMS rates may apply).
                </li>
                <li>
                  <strong>Address</strong> — everyone can add a home address here. It&apos;s shown
                  on the Cleaners directory alongside phone and service area today; it&apos;s not
                  used for anything automatic yet, but it&apos;s there for when the{" "}
                  <a href="#dispatcher">Turnover dispatcher</a> starts taking proximity into
                  account.
                </li>
                <li><strong>Bio</strong> — a short intro: experience, availability, specialties.</li>
                <li>
                  <strong>Business name</strong> (Owner only) — shown on invite messages and in the
                  Handbook. Signing up doesn&apos;t ask for one, so set it here whenever you like.
                </li>
                <li>
                  <strong>Turnover dispatcher</strong> (Owner/Manager) — a switch that turns
                  automatic job assignment on or off for the whole team. See{" "}
                  <a href="#dispatcher">Turnover dispatcher</a>.
                </li>
                <li>
                  <strong>Identity verification</strong> and <strong>Payouts</strong> (cleaners) —
                  see <a href="#trust">ID verification</a> and <a href="#payments">Cleaner payouts</a>.
                </li>
              </ul>
              <h3>Devices &amp; sessions</h3>
              <p>
                You can be signed in on a computer and a phone at the same time. This section
                lists the devices that have signed in to your account, with when each was last
                seen. Whenever your account signs in on a device it hasn&apos;t seen before, you
                get a <strong>Signed in on a new device</strong> notification naming it (if
                you&apos;ve turned notifications on). If you don&apos;t recognise one, or you just
                want to close out an old session, press{" "}
                <span className="hb-kbd-chip">Sign out other devices</span> — it ends every other
                session and keeps the one you&apos;re on.
              </p>
            </section>

            <section className="hb-section" id="dashboard">
              <span className="hb-kicker">Insight</span>
              <h2>Dashboard</h2>
              <p>
                <span className="hb-kbd-chip">Manage → Dashboard</span> (Owner/Manager) is the
                at-a-glance page. Five tiles:
              </p>
              <ul>
                <li><strong>Cleans due in 7 days</strong> — bookings checking out within the next week that aren&apos;t complete yet.</li>
                <li><strong>Open jobs, unclaimed</strong> — jobs on the open board nobody has claimed.</li>
                <li><strong>In progress right now</strong> — jobs a cleaner has started.</li>
                <li><strong>Open disputes</strong></li>
                <li><strong>Team rating avg</strong> — the average of every rating given, with how many active cleaners you have.</li>
              </ul>
              <p>
                Below the tiles, the <strong>Same-day conflict spotter</strong> checks today and the
                next 3 days. Where one guest checks out and the next checks in on the same day, it
                compares when the clean is expected to finish with the next guest&apos;s earliest
                check-in, and flags a clean that will run past it (&quot;Conflict&quot;), one with
                under an hour to spare (&quot;Tight&quot;), overlapping bookings, and same-day
                turnovers with no cleaner assigned. Set each property&apos;s check-out time, earliest
                check-in, usual clean length and time zone under <span className="hb-kbd-chip">Manage →
                Properties</span> (&quot;Turnover times&quot;). Once three cleans at a property have
                been timed, their average replaces the usual length. It is a set of rules, not a
                prediction: it only knows what is on the calendar and the times you give it.
              </p>
              <p>
                Then <strong>Needs attention</strong> lists each open dispute and each
                unclaimed open job — type, property, date (marked &quot;past&quot; if it&apos;s
                already gone by) and detail — oldest first. When there&apos;s nothing to chase it
                says so.
              </p>
            </section>

            <section className="hb-section" id="conflict-spotter">
              <h2>Same-day conflict spotter</h2>
              <p>
                A built-in checker (Owner/Manager) that cross-checks the calendar against cleaning
                status and flags tight or overlapping turnovers before they become a problem. It
                runs every time you open <span className="hb-kbd-chip">Manage → Dashboard</span>
                and looks at today and the next 3 days. For each turnover where one guest checks
                out and the next checks in on the same day, it works out when the clean should
                finish and compares that with the next guest&apos;s earliest check-in.
              </p>
              <ul>
                <li><strong>Conflict</strong> — the clean is expected to finish after the next check-in, e.g. &quot;This clean is scheduled to finish 20 minutes after the next guest&apos;s earliest check-in (3:00 pm)&quot;. Also used for overlapping bookings, a check-in time set at or before check-out, and a same-day turnover today with no cleaner assigned.</li>
                <li><strong>Tight</strong> — the clean should finish, but with under an hour to spare. Same-day turnovers on later days with no cleaner assigned also show here.</li>
              </ul>
              <p>
                <strong>Setting it up:</strong> under <span className="hb-kbd-chip">Manage →
                Properties</span>, each property has <em>Turnover times</em>: check-out time,
                earliest check-in, usual clean length (minutes) and time zone. The defaults are
                10:00 am, 3:00 pm, 120 minutes and Australia/Sydney. Once three cleans at a
                property have been timed by cleaners, the average of those recorded cleans is used
                instead of the usual length.
              </p>
              <p>
                <strong>What it can and can&apos;t do:</strong> it follows set rules rather than
                predicting the future, so it only knows what is on the calendar and the times you
                give it. A clean that has been started uses its real start time; one that hasn&apos;t
                is assumed to start at check-out (or now, if check-out has passed). It doesn&apos;t
                send alerts: check the Dashboard on turnover days.
              </p>
            </section>

            <section className="hb-section" id="dispatcher">
              <h2>Turnover dispatcher</h2>
              <p>
                An optional automation (Owner/Manager) that assigns a cleaner to a new or
                reshuffled booking for you, instead of it waiting for a human to notice or a
                cleaner to claim it from the open board. It runs every time a calendar syncs — the
                per-feed <em>Sync now</em> button, <em>Sync all feeds</em>, or an automatic
                scheduled sync — so it reacts the moment a booking appears or its dates move.
              </p>
              <ul>
                <li><strong>A brand-new booking</strong> is assigned to whichever active cleaner has cleaned that exact property the most, tie-broken by whoever did it most recently, skipping anyone marked unavailable that day.</li>
                <li><strong>No one fits</strong> (nobody with history there is free that day) — it&apos;s posted to the open job board instead of guessing, same as if you&apos;d opened it yourself.</li>
                <li><strong>A booking&apos;s dates shift</strong> and the cleaner already on it is still free — nothing changes. They only get swapped out if they&apos;ve since marked themselves unavailable for the new date.</li>
              </ul>
              <p>
                <strong>Turning it on:</strong> from <span className="hb-kbd-chip">My Profile</span>,
                an Owner or Manager can flip the Turnover dispatcher switch at any time. It&apos;s
                off by default, and turning it on or off never touches bookings that are already
                assigned — it only acts on what changes from that point on. Your own manual
                assignments and the open job board work exactly the same whether it&apos;s on or
                off.
              </p>
              <p>
                <strong>What it can and can&apos;t do:</strong> it currently ranks cleaners only by
                how often they&apos;ve worked a property and whether they&apos;re free — it doesn&apos;t
                yet consider how close a cleaner lives to a property, even though a cleaner can add
                a home address from My Profile (see below). Once an organization has turned it on, a
                date shift can reshuffle <em>any</em> booking whose cleaner becomes unavailable, not
                only ones the dispatcher itself originally assigned — so a manual assignment can
                still get reshuffled if the date moves and that cleaner is no longer free.
              </p>
            </section>

            <section className="hb-section" id="reports">
              <h2>Reports &amp; CSV export</h2>
              <p>
                <span className="hb-kbd-chip">Manage → Reports</span> (Owner/Manager) analyses
                your <strong>completed</strong> cleans.
              </p>
              <ul>
                <li>
                  <strong>Filters</strong> — From and To (by check-in date), Property and Cleaner.
                  Everything below updates as you change them.
                </li>
                <li>
                  <strong>Tiles</strong> — Completed cleans, Nights cleaned, Average rating and
                  Disputes for the filtered set, then <strong>Priciest to turn over</strong> (the
                  property with the highest average cost per clean) and{" "}
                  <strong>Fastest cleaner</strong> (lowest average cleaning time).
                </li>
                <li>
                  <strong>Trend over time</strong> — once the filtered cleans span more than one
                  month, a bar per month showing the number of cleans and that month&apos;s average
                  rating.
                </li>
                <li>
                  <strong>By property</strong> — cleans, nights, average rating and average cost
                  per clean. <strong>By cleaner</strong> — cleans, average rating and average
                  time.
                </li>
                <li>
                  <strong>Matching jobs</strong> — the full list: property, guest(s), check-in,
                  nights, source, cleaner, rating and dispute.
                </li>
              </ul>
              <div className="hb-callout">
                <strong>How cost and time are worked out</strong>
                Cost is an estimate at each property&apos;s <em>current</em> payout rate, plus its
                linen fee on jobs where linen was picked up — not necessarily what was actually
                paid at the time — and shows a dash if the property has no rate set. Cleaning time
                only exists for jobs a cleaner ran from their own account (see{" "}
                <a href="#booking">Opening &amp; editing a booking</a>), so it fills in going
                forward, not for past jobs.
              </div>
              <p>
                <span className="hb-kbd-chip">Export CSV</span> downloads whatever the filters
                currently show as <code>cleancal-report-YYYY-MM-DD.csv</code>, with the columns:
                Property, Guest(s), Check-in, Nights, Source, Cleaner, Rating, Rating comment,
                Dispute, Est. cost and Duration (min). It opens straight in Excel or Google Sheets.
              </p>
            </section>

            <section className="hb-section" id="statements">
              <span className="hb-kicker">Add-on (beta)</span>
              <h2>Owner statements: Clients &amp; Payouts</h2>
              <p>
                If you manage properties on behalf of landlords, this add-on is the start of
                monthly owner statements: what the booking platform paid out, less cleaning,
                your management fee and any expenses. It&apos;s in beta and is switched on per account, so you
                only see it if it&apos;s been enabled for yours — then{" "}
                <strong>Clients &amp; fees</strong>, <strong>Payouts</strong> and{" "}
                <strong>Owner statements</strong> appear in the <strong>Manage</strong> menu (Owner/Manager only). Don&apos;t see them and want
                them? Email <a href="mailto:support@cleancal.net">support@cleancal.net</a>.
              </p>
              <div className="hb-callout">
                <strong>Not the same as cleaner payouts</strong>
                <em>Payouts</em> here means money the booking platforms (Airbnb, Booking.com…)
                paid <em>you</em>. Paying your cleaners is separate — see{" "}
                <a href="#payments">Cleaner payouts</a>.
              </div>
              <h3>Clients &amp; fees</h3>
              <p>
                A <strong>client</strong> is the owner of a property you manage (to keep it
                apart from the CleanCal account Owner role). Open{" "}
                <span className="hb-kbd-chip">Manage → Clients &amp; fees</span>:
              </p>
              <ul>
                <li>
                  <strong>Add a client</strong> — name, <strong>statement currency</strong>{" "}
                  (AUD, NZD, GBP, EUR, USD, CAD, ZAR, INR, SGD or JPY), email (where statements
                  will go) and phone. A client&apos;s row in the table shows how many properties they have, with{" "}
                  <strong>Edit</strong> and <strong>Remove</strong>. Removing a client leaves their
                  properties in place, just unassigned.
                </li>
                <li>
                  <strong>Property fees</strong> — each property is a collapsed row showing its client; tap it to open. For each property: its <strong>Client</strong>,{" "}
                  <strong>Management fee %</strong>, <strong>Fee charged on</strong> (the full
                  payout, or the payout after cleaning), and <strong>Cleaning charged to owner
                  ($)</strong>. Leave the cleaning charge blank and it uses that property&apos;s
                  cleaner payout rate, plus the linen fee when linen was picked up. Press{" "}
                  <span className="hb-kbd-chip">Save fees</span>. The heading counts properties
                  that still have no client.
                </li>
                <li>
                  <strong>Platform listings</strong> — a property can have any number of listings
                  on any platform. Each is a platform plus what that platform&apos;s payout export
                  calls the property (its title or listing ID). They help payouts find the right
                  property when a line has no confirmation code. The page lists platforms the
                  property has a calendar feed from but no listing yet, so nothing is missed.
                </li>
              </ul>
              <h3>Payouts</h3>
              <p>
                <span className="hb-kbd-chip">Manage → Payouts</span> brings in the money rows.
              </p>
              <ol className="hb-step-list">
                <li>
                  Download a CSV from the platform — Airbnb: <strong>Earnings → Transaction
                  history → export CSV</strong>; Booking.com: export reservations or payouts from
                  the extranet. Keep each file to about a month at a time (uploads are limited to
                  roughly 900 KB).
                </li>
                <li>
                  Choose the file, set <strong>Currency (if the file doesn&apos;t say)</strong>{" "}
                  for exports with no currency column, leave <strong>Platform</strong> and{" "}
                  <strong>Dates in file</strong> on <em>Detect automatically</em> (or pick Airbnb, Booking.com,
                  Other, and Day/month/year or Month/day/year if the result looks wrong), and
                  press <span className="hb-kbd-chip">Import</span>.
                </li>
                <li>
                  A summary says how many lines were imported, how many matched a booking, how
                  many matched a property only and how many need a property, plus any warnings and
                  skipped rows. Importing the same file twice never doubles anything.
                </li>
                <li>
                  Lines CleanCal couldn&apos;t place land under <strong>Needs a property</strong>.
                  Pick the property (and optionally the booking), tick{" "}
                  <strong>Remember this listing for next time</strong> so the next import matches
                  by itself, and press <span className="hb-kbd-chip">Save</span> — or{" "}
                  <span className="hb-kbd-chip">Ignore</span> a line that doesn&apos;t belong.
                  <span className="hb-kbd-chip">Re-run matching</span> retries them all after you
                  add listings.
                </li>
              </ol>
              <p>
                Lines are matched by the booking&apos;s confirmation code first (Airbnb&apos;s
                code is read from its calendar feed automatically), then by listing and check-in
                date, then by listing alone. A line matched to a booking fills in that
                booking&apos;s guest name on the calendar, without ever overwriting a name that
                is already there. <strong>Not linked to a booking</strong> lists lines placed on a
                property only, which still count toward its owner statement — linking a booking
                adds the guest and nights. <strong>Ignored lines</strong> can be restored, and{" "}
                <strong>Recent imports</strong> shows each file with an{" "}
                <span className="hb-kbd-chip">Undo</span> that removes that whole import.
              </p>
              <h3>Owner statements</h3>
              <p>
                <span className="hb-kbd-chip">Manage → Owner statements</span> turns it all into
                a monthly statement for each client.
              </p>
              <ol className="hb-step-list">
                <li>
                  Pick the <strong>Client</strong> and the <strong>Period</strong>: a{" "}
                  <strong>Month</strong>, or a <strong>Financial / tax year</strong> — choose your{" "}
                  <strong>Country</strong> and the year follows its dates (Australia 1 July to 30
                  June, New Zealand and India 1 April to 31 March, UK 6 April to 5 April, South
                  Africa 1 March to end February, and calendar year for the US, Canada and
                  Ireland; <em>Calendar year (other)</em> covers anywhere else).
                  A financial-year statement adds a month-by-month table and a total, which you
                  can give to the owner or their accountant for tax time (it&apos;s a summary of
                  your records, not tax advice, and GST, VAT and other sales taxes aren&apos;t calculated). Amounts show in the client&apos;s currency, and payouts in another currency are left out and flagged rather than converted. The statement
                  is worked out live: platform payouts (by payout date) less a cleaning charge for
                  each stay that checked out that month, less your management fee, less expenses.
                  It&apos;s broken down property by property.
                </li>
                <li>
                  Add <strong>Expenses</strong> under the statement — a property, a date, what it
                  was for and the amount (a replacement kettle, say). They count against the
                  owner&apos;s net for that month, and <strong>Remove</strong> takes one back out.
                </li>
                <li>
                  Press <span className="hb-kbd-chip">Save statement</span> to freeze a copy.
                  Later changes to fees, payouts or expenses won&apos;t alter a saved copy;{" "}
                  <strong>Re-save</strong> replaces it with fresh numbers.
                </li>
                <li>
                  On the saved statement, <strong>Print or save as PDF</strong> gives a clean
                  printable page. Switch on the <strong>Owner link</strong> to get a private page
                  your client can open without signing in — copy the link or press{" "}
                  <strong>Email to client</strong> (it opens your email app with the link filled
                  in). Anyone with the link can see that one statement, so switch it off or{" "}
                  <strong>Replace link</strong> whenever you want it to stop working.
                </li>
              </ol>
              <p>
                Every statement opens with a short plain-language summary above the tables —
                stays, payouts, deductions and the net payout, in a sentence or two, plus which
                property drove the most of it when a client has more than one. It&apos;s written
                straight from the same numbers as the tables below it, so an owner who only reads
                the first line still gets the gist.
              </p>
              <p>
                The cleaning charge per stay is the property&apos;s &quot;Cleaning charged to
                owner&quot; amount if you set one, otherwise the cleaner payout rate plus the
                linen fee when linen was picked up. If a statement looks short, check that
                payouts are imported and matched to a property, and that the property is assigned
                to the client.
              </p>
              <p>
                Money from this add-on is visible to Owners and Managers only — cleaners can
                never see client fees or payout figures.
              </p>
            </section>

            <section className="hb-section" id="trust">
              <span className="hb-kicker">Trust &amp; money</span>
              <h2>ID verification &amp; background checks</h2>
              <p>
                A cleaner verifies their own identity from Menu → My Profile — a government ID
                and a live selfie, handled by Stripe&apos;s own verification flow. The result
                comes back automatically and shows as a status badge —{" "}
                <span className="hb-verify-pill">✓ ID verified</span>, or{" "}
                <span className="hb-pending-pill">pending</span> while it&apos;s still processing
                — visible to Owners and Managers on the Cleaners page, so you can see it before
                assigning a job, not after.
              </p>
              <p>
                If a verification doesn&apos;t go through, the profile says so and the button
                changes to <span className="hb-kbd-chip">Restart verification</span> so you can
                try again; while it&apos;s processing it also offers a restart, and it updates by
                itself once the result comes back.
              </p>
              <div className="hb-callout warn">
                <strong>Background checks aren&apos;t live yet</strong>
                Criminal-history screening is planned but not built — it needs a signed agreement
                with a screening provider (e.g. Checkr) before it can be wired up. Don&apos;t rely
                on CleanCal for this today; if it matters for your business, screen cleaners
                through your own process until this ships.
              </div>
            </section>

            <section className="hb-section" id="payments">
              <h2>Cleaner payouts</h2>
              <p>
                Payouts are per-property, not automatic, and always a deliberate action — nothing
                moves money on its own. Setting the dollar amounts is Owner-only; triggering an
                actual payment is open to any staff.
              </p>
              <ol className="hb-step-list">
                <li>
                  An Owner sets a payout rate for each property on the Properties page, and — if
                  this property&apos;s linen gets taken off-site to launder — a linen fee: a
                  per-box rate and how many boxes the property uses (roughly one box per one-bed
                  bedroom, though it can differ).
                </li>
                <li>A cleaner connects their own payout account from Menu → My Profile (&quot;Set up payouts&quot;) — a short Stripe-hosted onboarding flow.</li>
                <li>
                  If a specific booking needs its linen picked up, staff tick &quot;Cleaner takes
                  linen off-site to clean&quot; in that booking (next to Assignment) — this is a
                  per-booking choice, since not every clean needs it.
                </li>
                <li>
                  Once a booking is marked Complete and has an assigned cleaner, staff see a
                  &quot;Pay $X&quot; button right in that booking — the total already includes the
                  linen fee if that box was ticked. Clicking it sends the payout.
                </li>
              </ol>
              <p>
                In place of the button, that <strong>Cleaner payout</strong> section tells you why
                it isn&apos;t available: <em>Paid ✓</em> once it&apos;s been sent, <em>No payout
                rate set for this property</em> (set one on the Properties page), or{" "}
                <em>This cleaner hasn&apos;t finished setting up payouts yet</em>. On the{" "}
                <a href="#cleaners-page">Cleaners page</a>, each cleaner&apos;s card shows a{" "}
                <strong>Payouts set up / pending / not set up</strong> badge so you can see this
                before you assign them.
              </p>
              <div className="hb-callout">
                <strong>What a cleaner sees</strong>
                Today, payout status isn&apos;t shown to cleaners directly in the app — check with
                your Owner or Manager if you&apos;re unsure whether a job&apos;s been paid.
              </div>
            </section>

            <section className="hb-section" id="pricing">
              <h2>Pricing &amp; your free trial</h2>
              <p>CleanCal&apos;s pricing scales with the number of properties on your account, plus an optional add-on for larger operations:</p>
              <div className="hb-table-wrap">
                <table>
                  <tbody>
                    <tr><th>Plan</th><th>Price</th><th>Includes</th></tr>
                    <tr><td>Any number of properties</td><td>Free for 3 months, then $2/property/month</td><td>Everything else in this Handbook</td></tr>
                    <tr><td>Pro add-on (optional)</td><td>+$19/month flat</td><td>Owner statements, the turnover dispatcher, and reports benchmarking (cross-property/cleaner cost &amp; speed, trend over time)</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                In the last 30 days of your free trial, Owners and Managers see a banner across
                the top of the calendar counting down the days left (and saying so once it has
                ended), until billing has actually been set up from My Profile &rarr; Billing —
                once it has, that page is where everything about your subscription (including
                whether or when you&apos;ll be charged) is explained instead. Press the ✕ to
                dismiss the banner; it&apos;s hidden for the rest of that day and comes back the
                next, so a real deadline never gets silenced for good.
              </p>
              <p>
                If you&apos;ve agreed a special price with us, that banner is replaced by a plain
                note that you have a custom pricing agreement (with the monthly amount, if one was
                set), and the standard pricing above doesn&apos;t apply to your account.
              </p>
            </section>

            <section className="hb-section" id="faq">
              <span className="hb-kicker">Reference</span>
              <h2>FAQ &amp; troubleshooting</h2>
              <h3>Can I take bookings that don&apos;t come from a platform?</h3>
              <p>Yes. Use <strong>+ New booking</strong>, set the platform to <em>Direct</em>, and add the guest&apos;s email, phone and notes. Only Owners and Managers can see those details; cleaners see just the guest name. See <a href="#booking">Opening &amp; editing a booking</a>.</p>
              <h3>Does CleanCal connect to my PMS?</h3>
              <p>Not directly — it reads and writes calendar (iCal) links instead. See <a href="#sync">Properties &amp; two-way sync</a>. If your system can give you a calendar link, it works alongside it.</p>
              <h3>My owner statement looks short</h3>
              <p>Check that payouts are imported and matched to a property (Manage → Payouts), that the property is assigned to the client with its fee set (Manage → Clients &amp; fees), and that you&apos;re looking at the right month. See <a href="#statements">Owner statements</a>.</p>
              <h3>A booking didn&apos;t sync from my OTA</h3>
              <p>Check the feed&apos;s status on the Properties page — a red &quot;Error&quot; pill shows the reason. Most often the calendar link expired; grab a fresh export URL from the platform and re-paste it.</p>
              <h3>A booking disappeared from the calendar</h3>
              <p>A booking that drops out of its own source feed — almost always a cancellation — is deleted automatically the next time that property syncs, rather than left on the calendar for review. Every Owner/Manager, and whoever was assigned to it, gets a push notification naming the property and date so it&apos;s never a silent surprise.</p>
              <h3>I promoted the wrong person to Manager</h3>
              <p>Go to Cleaners → Team roles and change it back. You can&apos;t change your own role, so you can&apos;t lock yourself out — but nothing stops you fixing someone else&apos;s.</p>
              <h3>The checklist only shows one Bedroom/Bathroom for a bigger property</h3>
              <p>Set that property&apos;s real bedroom and bathroom count on the Properties page, under &quot;Property profile.&quot; Every property defaults to 1 bedroom / 1 bathroom / no outdoor area until you do.</p>
              <h3>Can I use a platform that&apos;s not in the list of badges?</h3>
              <p>Yes — any platform with a calendar export URL works, badge or not. A recognized platform (Airbnb, Vrbo, Booking.com, and a growing list of others) gets its own color; anything else still syncs, just with a plain grey badge.</p>
              <h3>My magic-link email didn&apos;t work</h3>
              <p>This is almost always Gmail (or a similar provider) automatically opening the link to scan it for safety, which uses it up before you tap it. Request a new code and type it into the page instead of tapping the link.</p>
              <h3>I can see a job but not the guest name or details</h3>
              <p>As a cleaner, a job that isn&apos;t confirmed as yours shows only an <strong>Assign</strong> checkbox. Tick it to claim the job, or open it and press Claim this job; if an Owner/Manager assigned it to you directly, press Confirm first. You can&apos;t update a job&apos;s checklist or status until you&apos;ve confirmed it.</p>
              <h3>It won&apos;t let me mark a job complete</h3>
              <p>A cleaner has to attach at least one photo first, and any photo marked <strong>Blurry</strong> has to be retaken or removed. See <a href="#checklist">Cleaning checklist &amp; photos</a>.</p>
              <h3>I see a letter instead of someone&apos;s name on the calendar</h3>
              <p>That&apos;s their preferred initial, shown when a bar is too short for the full name. Open the booking to see the job in full, or have the cleaner check their initial and colour in <a href="#profile">My Profile</a>.</p>
              <h3>A cleaner can&apos;t sign in any more</h3>
              <p>If an Owner removed them from the team, they can&apos;t sign in until an Owner presses Restore access on the Cleaners page (under Removed cleaners). A deleted account can&apos;t be restored; send a fresh invite link instead.</p>
              <h3>I got a &quot;Signed in on a new device&quot; alert and it wasn&apos;t me</h3>
              <p>Open Menu → My Profile and press <strong>Sign out other devices</strong>, then sign back in on anything you still use. See <a href="#profile">My Profile &amp; devices</a>.</p>
              <h3>My invite link doesn&apos;t work</h3>
              <p>Each invite link works once, and the page tells you if one is invalid or already used. Ask an Owner or Manager for a new one from Menu → Invite team.</p>
              <h3>I&apos;m not getting notifications</h3>
              <p>Turn them on from Menu → Enable notifications, ideally inside the installed app, and check your browser or phone hasn&apos;t blocked notifications for CleanCal. The full list of alerts is under <a href="#notifications">Notifications</a>.</p>
              <h3>Something else isn&apos;t covered here</h3>
              <p>Email <a href="mailto:support@cleancal.net">support@cleancal.net</a> and we&apos;ll help you out.</p>
            </section>
          </div>
          <footer className="hb-footer">
            CleanCal Handbook — keep this open while you set up your first property. Questions? <a href="mailto:support@cleancal.net">support@cleancal.net</a>
          </footer>
        </main>
      </div>
    </div>
  );
}
