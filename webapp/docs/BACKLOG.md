# Backlog

Things worth doing, logged for later rather than acted on now. Not in any particular sprint order beyond the rough priority notes below.

## Before real billing goes in

1. ~~**Payout reliability gap.**~~ Resolved 2026-10-23, differently than the gap's own fix: `payCleanerForBooking` sent a real Stripe Connect transfer, but tracing it end to end turned up something worse than the reliability gap itself -- the transfer moved money out of *CleanCal's own* Stripe balance, not the property owner's, since nothing ever charged the owner first. Every payout was quietly funded out of pocket with no way to recover it. Rather than patch the atomicity/webhook gaps on top of that, push payments were removed entirely: `markCleanerPaid` (`src/app/calendar/actions.ts`) just records that an Owner paid a cleaner directly (bank transfer, cash, whatever), no Stripe call involved. See README's "Cleaner payouts" section. Reinstating real push payments later needs an owner-charge step built in from the start, not just restoring the old Connect flow.
2. ~~**Legal page placeholders.**~~ Done 2026-10-03: `support@cleancal.net` is now a real, live inbox (GoDaddy Microsoft 365) -- the placeholder comments in `src/app/terms/page.tsx` and `src/app/privacy/page.tsx` are cleared, and the address is now also surfaced to customers on the landing page footer and the Handbook (FAQ + footer). The placeholder governing-law jurisdiction in `terms/page.tsx` is still unconfirmed.
3. ~~**No enforcement on non-payment.**~~ Resolved 2026-10-24: `trialing`/`active`/`past_due` stay fully functional (Stripe's own dunning plus the existing billing-card nag already cover a merely-failed payment), but `canceled` now gets a real, database-level read-only lockout -- see `supabase/migrations/0061_canceled_org_lockout.sql` and `CanceledOrgNotice.tsx`.

## Real but limited -- not broken, just worth knowing

4. **Background checks aren't built.** Only ID verification (Stripe Identity -- selfie + ID match) is live; a real background-check provider (e.g. Checkr) would need its own integration and agreement. The Handbook is already honest about this gap.
5. **Ratings are decorative.** Owners rate cleaners after a job and it shows as an average on the Cleaners page, but nothing else uses it -- it doesn't sort the cleaner list or factor into who's suggested when assigning a job. Would be a cheap win to make it actually matter.

## Explicitly paused (do not resume without Daniel raising it again)

- **Referral program.** Discussed reward tiers (3/2/1 free months by property-tier) but Daniel wants to think it through more before building, especially since it was going to need to "waive a charge" against real billing that doesn't exist yet.
