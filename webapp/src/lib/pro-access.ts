import type { SupabaseClient } from "@supabase/supabase-js";
import { isSuperadmin } from "./superadmin";

// Whether the CALLER's own organization has Pro -- either a hand-granted
// negotiated deal (organizations.statements_enabled) or having actually
// bought the $10/month Pro add-on (organizations.pro_addon_active, set
// only by the Stripe webhook from the subscription's real line items --
// see src/lib/billing.ts, 0057_pro_addon.sql). Either is enough, same OR
// as getStatementsAccess() in statements-access.ts, which predates this
// and is kept as its own thing since it also carries a staff-only role
// check that a general Pro gate like this one doesn't need.
//
// Pro today gates: owner statements (via getStatementsAccess, which
// duplicates this OR rather than calling it, for the reason above), the
// turnover dispatcher (update_dispatcher_enabled() in
// 0058_pro_gated_features.sql -- enforced in the database, not just
// here), cross-property/cross-cleaner benchmarking on /reports
// (ReportsView.tsx), and the AI checklist photo reviewer
// (reviewCompletedBookingPhotos in calendar/actions.ts).
//
// Relies on organizations_select_own RLS (0016) to scope the query to
// exactly the caller's own org -- always call this with the caller's own
// request-scoped Supabase client (never a service-role client, which
// would bypass that scoping and silently check the wrong org, or every
// org).
//
// The superadmin account (src/lib/superadmin.ts) always gets Pro, same
// reasoning as getStatementsAccess -- it needs to be tried, including
// background/automated bits like the photo reviewer, before any real org
// has paid for it.
export async function orgHasPro(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (isSuperadmin(user?.email)) return true;

  const { data: org } = await supabase
    .from("organizations")
    .select("statements_enabled, pro_addon_active")
    .maybeSingle();
  return Boolean(org?.statements_enabled) || Boolean(org?.pro_addon_active);
}
