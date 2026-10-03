// "Owns the whole CleanCal business" isn't a role that exists inside any
// one organization's Owner/Manager/Cleaner hierarchy (see
// supabase/migrations/0016_organizations.sql) -- every normal query and
// role check is deliberately scoped to the caller's own org. This is the
// one specific account that should also see platform-wide data (the
// /admin/stats page, and its own nav link to it), so it's gated on a
// hardcoded email rather than a role or a database flag.
export const SUPERADMIN_EMAIL = "danielkingma@gmail.com";

export function isSuperadmin(email: string | null | undefined): boolean {
  return email === SUPERADMIN_EMAIL;
}
