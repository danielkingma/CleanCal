import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses Row Level Security entirely. Three
// callers: the Vercel Cron route handler (a trusted, unauthenticated
// context with no user session to scope to), src/lib/push.ts (which
// needs to read push_subscriptions rows across users -- a caller acting
// on their own booking still needs to reach the *other* party's
// subscription to notify them, which their own RLS-scoped session can
// never see), and src/app/admin/stats/page.tsx (the one page that
// deliberately looks across every organization at once, gated by a
// hardcoded owner email check before this is ever called). Never import
// this from client-side code, and never use it to read or write
// anything beyond those narrow cases.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set -- cron auto-sync is disabled.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
