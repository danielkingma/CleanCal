import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses Row Level Security entirely. Only ever
// call this from a trusted, unauthenticated server context that has no
// user session to scope a request to (right now: the Vercel Cron route
// handler). Never import this from client-side code or anything that
// handles an incoming user request directly.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set -- cron auto-sync is disabled.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
