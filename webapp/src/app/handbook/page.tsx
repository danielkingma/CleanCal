"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

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

          <div className="hb-side-group-title">Getting started</div>
          <a className="hb-side-link" href="#welcome">Welcome</a>
          <a className="hb-side-link" href="#signing-in">Signing in &amp; your business</a>
          <a className="hb-side-link" href="#roles">Roles at a glance</a>
          <a className="hb-side-link" href="#navigation">Finding your way around</a>

          <div className="hb-side-group-title">Day to day</div>
          <a className="hb-side-link" href="#calendar">The calendar</a>
          <a className="hb-side-link" href="#sync">Properties &amp; two-way sync</a>
          <a className="hb-side-link" href="#checklist">Cleaning checklist &amp; photos</a>
          <a className="hb-side-link" href="#team">Managing the cleaning team</a>
          <a className="hb-side-link" href="#disputes">Disputes</a>
          <a className="hb-side-link" href="#mobile">Mobile app &amp; notifications</a>

          <div className="hb-side-group-title">Trust &amp; money</div>
          <a className="hb-side-link" href="#trust">ID verification &amp; background checks</a>
          <a className="hb-side-link" href="#payments">Cleaner payouts</a>
          <a className="hb-side-link" href="#pricing">Pricing</a>

          <div className="hb-side-group-title">Reference</div>
          <a className="hb-side-link" href="#faq">FAQ &amp; troubleshooting</a>
        </nav>

        <main className="hb-main">
          <div className="hb-content">
            <div className="hb-hero">
              <span className="hb-eyebrow">CleanCal Handbook</span>
              <h1>Every turnover, tracked, cleaned, and paid.</h1>
              <p>
                This handbook covers CleanCal end to end — the calendar, calendar sync, the
                cleaning checklist, your cleaning team, and trust &amp; payments. Skim the
                sidebar for what you need, or read straight through if you&apos;re setting up
                for the first time.
              </p>
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
                  <strong>Cleaners</strong> — see their own assignments, the open job board,
                  their ratings, and manage their own ID verification and payout setup.
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
              <p>
                The first time you sign in, you land on a short setup step instead of the
                calendar, since you don&apos;t belong to a business yet:
              </p>
              <ul>
                <li>
                  <strong>Starting your own business</strong> — give it a name and you become its
                  Owner immediately.
                </li>
                <li>
                  <strong>Joining an existing one</strong> — if someone sent you an invite link,
                  open it and confirm; you&apos;re added with whatever role they set (Cleaner,
                  Manager, or Owner).
                </li>
              </ul>
              <div className="hb-callout">
                <strong>Inviting someone to your team</strong>
                Owners and Managers can generate an invite link from Cleaners → &quot;Invite
                someone to your team.&quot; Generating one also gives you a ready-to-send message
                with your business name and the link already in it, plus a button that opens your
                email app with that message pre-filled — or just copy the plain link and send it
                however you like (text, WhatsApp, etc.). A Manager can only invite at the Cleaner
                level; only an Owner can invite another Owner or Manager. Each link works once.
              </div>
              <p>
                A business&apos;s data is completely separate from every other business on
                CleanCal — nobody outside your team ever sees your properties, bookings, or
                cleaners, and you never see theirs.
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
                      <td>View &amp; create bookings, manage the calendar</td>
                      <td className="yes">Yes</td>
                      <td className="yes">Yes</td>
                      <td className="no">Own jobs only</td>
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
                      <td>Invite a new Manager or Owner</td>
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
              <p>The calendar&apos;s top bar has two dropdowns, color-coded so they&apos;re easy to tell apart at a glance:</p>
              <ul>
                <li><strong>Manage</strong> (Owner/Manager only) — Dashboard, Reports, Properties, Cleaners.</li>
                <li><strong>Menu</strong> (everyone) — this Handbook, your Cleaning History, your Availability calendar, My Profile, and the notifications toggle.</li>
              </ul>
            </section>

            <section className="hb-section" id="calendar">
              <span className="hb-kicker">Day to day</span>
              <h2>The calendar</h2>
              <p>On desktop, three views, switched from the top bar:</p>
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
                On mobile, Week and Year are replaced with two views built for a phone screen:{" "}
                <strong>Cleaning List</strong> (a scrollable day-by-day agenda, paginated by
                month) and <strong>Month</strong> (a compact grid for one property at a time).
              </p>
              <p>
                A bar always starts a little into its check-in day and ends a little into its
                checkout day — 2pm check-in, 10am checkout — so a same-day turnover reads
                correctly instead of looking like a gap or a double-booking.
              </p>
              <p>Click any bar to open it. Click empty space on the calendar to start a new booking (Owner/Manager only).</p>
            </section>

            <section className="hb-section" id="sync">
              <h2>Properties &amp; two-way sync</h2>
              <p>Open <span className="hb-kbd-chip">Manage → Properties</span> from the calendar&apos;s top bar to manage each listing.</p>
              <h3>Bringing bookings in</h3>
              <ol className="hb-step-list">
                <li>On your OTA (Airbnb, Vrbo, Booking.com, or any other), find its calendar export link — usually under Calendar → Export or Sync.</li>
                <li>Paste it into the property&apos;s <span className="hb-kbd-chip">Add feed</span> field with a label, e.g. &quot;Airbnb&quot;.</li>
                <li>Click <span className="hb-kbd-chip">Sync now</span>, or leave it — feeds sync automatically on a schedule if that&apos;s configured for your account.</li>
              </ol>
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
            </section>

            <section className="hb-section" id="team">
              <h2>Managing the cleaning team</h2>
              <p>
                Assign a booking to a specific cleaner, or mark it <strong>Open</strong> so any
                cleaner on your team can claim it first-come, first-served — claiming is atomic,
                so two cleaners can never grab the same job. A cleaner who can&apos;t make it
                anymore can release a job back to the pool, or decline a directly-assigned job
                before it&apos;s started.
              </p>
              <p>
                Every completed job gets a 1–5 star rating with an optional note. Ratings roll up
                into each cleaner&apos;s profile average, visible right in the assignment
                dropdown — so you&apos;re never assigning blind.
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
            </section>

            <section className="hb-section" id="mobile">
              <h2>Mobile app &amp; notifications</h2>
              <p>
                CleanCal installs like a native app: open it in your phone&apos;s browser and use
                &quot;Add to Home Screen&quot; (or the browser&apos;s own install prompt) to get a
                home-screen icon that launches full-screen, no browser bar.
              </p>
              <p>
                From Menu → &quot;Enable notifications,&quot; you can get a push alert straight to
                your phone when: a job is assigned or posted open, a cleaner declines a job, a
                dispute message is posted, or a cleaning gets rated.
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
              <div className="hb-callout">
                <strong>What a cleaner sees</strong>
                Today, payout status isn&apos;t shown to cleaners directly in the app — check with
                your Owner or Manager if you&apos;re unsure whether a job&apos;s been paid.
              </div>
            </section>

            <section className="hb-section" id="pricing">
              <h2>Pricing</h2>
              <p>CleanCal&apos;s planned pricing scales with the number of properties on your account:</p>
              <div className="hb-table-wrap">
                <table>
                  <tbody>
                    <tr><th>Properties</th><th>Price</th></tr>
                    <tr><td>1 – 3</td><td>Free for 6 months, then $5/property/month</td></tr>
                    <tr><td>4 – 15</td><td>$5 per property/month</td></tr>
                    <tr><td>16 – 50</td><td>$150/month (flat)</td></tr>
                    <tr><td>51 – 100</td><td>$250/month (flat)</td></tr>
                    <tr><td>101 – 200</td><td>$350/month (flat)</td></tr>
                    <tr><td>201 – 500</td><td>$500/month (flat)</td></tr>
                    <tr><td>500+</td><td>Custom enterprise pricing</td></tr>
                  </tbody>
                </table>
              </div>
              <p>As your free trial period nears its end, CleanCal shows an in-app reminder before anything would ever be billed — no surprise charges.</p>
              <div className="hb-callout warn">
                <strong>Not billed yet</strong>
                This is the intended pricing structure — CleanCal doesn&apos;t yet charge anyone
                or enforce these tiers. Nothing about your account access changes based on
                property count today.
              </div>
            </section>

            <section className="hb-section" id="faq">
              <span className="hb-kicker">Reference</span>
              <h2>FAQ &amp; troubleshooting</h2>
              <h3>A booking didn&apos;t sync from my OTA</h3>
              <p>Check the feed&apos;s status on the Properties page — a red &quot;Error&quot; pill shows the reason. Most often the calendar link expired; grab a fresh export URL from the platform and re-paste it.</p>
              <h3>A guest cancelled but the booking&apos;s still showing</h3>
              <p>CleanCal never silently deletes a booking that disappears from a source feed — it flags it instead (a dashed outline on the bar) so an Owner or Manager can confirm and remove it, in case it was a sync hiccup rather than a real cancellation.</p>
              <h3>I promoted the wrong person to Manager</h3>
              <p>Go to Cleaners → Team roles and change it back. You can&apos;t change your own role, so you can&apos;t lock yourself out — but nothing stops you fixing someone else&apos;s.</p>
              <h3>The checklist only shows one Bedroom/Bathroom for a bigger property</h3>
              <p>Set that property&apos;s real bedroom and bathroom count on the Properties page, under &quot;Property profile.&quot; Every property defaults to 1 bedroom / 1 bathroom / no outdoor area until you do.</p>
              <h3>Can I use a platform that&apos;s not in the list of badges?</h3>
              <p>Yes — any platform with a calendar export URL works, badge or not. A recognized platform (Airbnb, Vrbo, Booking.com, and a growing list of others) gets its own color; anything else still syncs, just with a plain grey badge.</p>
              <h3>My magic-link email didn&apos;t work</h3>
              <p>This is almost always Gmail (or a similar provider) automatically opening the link to scan it for safety, which uses it up before you tap it. Request a new code and type it into the page instead of tapping the link.</p>
            </section>
          </div>
          <footer className="hb-footer">CleanCal Handbook — keep this open while you set up your first property.</footer>
        </main>
      </div>
    </div>
  );
}
