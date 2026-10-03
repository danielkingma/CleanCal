# Backlog

Things worth doing, logged for later rather than acted on now. Not in any particular sprint order beyond the rough priority notes below.

## Before real billing goes in

1. **Payout reliability gap.** `payCleanerForBooking` (`src/app/calendar/actions.ts`) sends the Stripe transfer, then separately updates `payout_status: "paid"` in the database. If that second write fails after the transfer succeeds, the cleaner has actually been paid but the app still shows the job as unpaid -- risk of double-paying someone who chases it up. Separately, the Stripe webhook (`src/app/api/webhooks/stripe/route.ts`) only handles `identity.verification_session.*` and `account.updated` -- a later `transfer.failed` or `transfer.reversed` event never reaches the app, so `payout_status` can go stale in the other direction too.
2. **Legal page placeholders.** `src/app/terms/page.tsx` and `src/app/privacy/page.tsx` hardcode `support@cleancal.net` as a placeholder contact address (with a comment flagging it needs a real inbox), plus a placeholder governing-law jurisdiction. Cheap to fix, easy to forget before anyone reads these pages closely.

## Real but limited -- not broken, just worth knowing

3. **Background checks aren't built.** Only ID verification (Stripe Identity -- selfie + ID match) is live; a real background-check provider (e.g. Checkr) would need its own integration and agreement. The Handbook is already honest about this gap.
4. **Ratings are decorative.** Owners rate cleaners after a job and it shows as an average on the Cleaners page, but nothing else uses it -- it doesn't sort the cleaner list or factor into who's suggested when assigning a job. Would be a cheap win to make it actually matter.

## Explicitly paused (do not resume without Daniel raising it again)

- **Referral program.** Discussed reward tiers (3/2/1 free months by property-tier) but Daniel wants to think it through more before building, especially since it was going to need to "waive a charge" against real billing that doesn't exist yet.
