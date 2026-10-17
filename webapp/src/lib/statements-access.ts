import type { SupabaseClient } from "@supabase/supabase-js";
import { isStaff, type Role } from "./types";
import { isSuperadmin } from "./superadmin";

export interface StatementsAccess {
  userId: string;
  organizationId: string;
  role: Role;
  allowed: boolean;
}

// The owner statements add-on is staff-only and switched on per org
// (organizations.statements_enabled). The superadmin account always has
// it, so it can be tried before any org pays for it. RLS on the
// add-on's tables is staff-only regardless; this check only decides
// whether the pages and nav links appear.
export async function getStatementsAccess(supabase: SupabaseClient): Promise<StatementsAccess | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) return null;

  const role = profile.role as Role;
  let enabled = isSuperadmin(user.email);
  if (!enabled) {
    const { data: org } = await supabase
      .from("organizations")
      .select("statements_enabled")
      .eq("id", profile.organization_id)
      .maybeSingle();
    enabled = Boolean(org?.statements_enabled);
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id as string,
    role,
    allowed: isStaff(role) && enabled,
  };
}

export async function requireStatementsAccess(supabase: SupabaseClient): Promise<StatementsAccess> {
  const access = await getStatementsAccess(supabase);
  if (!access?.allowed) throw new Error("Owner statements aren't enabled for your account.");
  return access;
}
