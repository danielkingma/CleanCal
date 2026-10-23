"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Dropdown from "./Dropdown";
import NotificationsToggle from "./NotificationsToggle";
import { createClient } from "@/lib/supabase/client";
import { isOwner as isOwnerRole } from "@/lib/types";

// The same "Manage" and "Menu" dropdowns CalendarApp's topbar has,
// factored out so every other signed-in page can link to the rest of
// the app too -- previously getting from, say, Reports to Cleaners
// meant going back to the calendar first to reach these menus.
export default function NavMenus({
  isStaffUser,
  isSuperadmin = false,
  statementsEnabled = false,
}: {
  isStaffUser: boolean;
  // Daniel's own account only -- see src/lib/superadmin.ts. Links to the
  // hidden platform-wide stats page, which isn't relevant to any normal
  // Owner/Manager/Cleaner.
  isSuperadmin?: boolean;
  // Owner statements add-on (organizations.statements_enabled). Pages
  // that don't pass it still show the links to the superadmin, who
  // always has the add-on while it's in beta.
  statementsEnabled?: boolean;
}) {
  const showStatements = statementsEnabled || isSuperadmin;

  // Whether to offer the Pro add-on's "Go Pro" badge and a direct Billing
  // shortcut, right here in the topbar on every page that renders
  // NavMenus -- rather than something only discoverable by opening My
  // Profile first. Fetched client-side (rather than threaded through as a
  // prop from the dozen-plus server pages that render NavMenus) so this
  // stays self-contained: every one of those pages already scopes its own
  // queries to the caller via RLS, and this is the same organizations_select_own
  // (0016) / profiles_select_own (0001) scoping, just run from here
  // instead of duplicated into every call site.
  const [billingPrompt, setBillingPrompt] = useState<{ isOwner: boolean; hasPro: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile || !isOwnerRole(profile.role)) return;
      let hasPro = isSuperadmin;
      if (!hasPro && profile.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("statements_enabled, pro_addon_active")
          .eq("id", profile.organization_id)
          .maybeSingle();
        hasPro = Boolean(org?.statements_enabled) || Boolean(org?.pro_addon_active);
      }
      if (!cancelled) setBillingPrompt({ isOwner: true, hasPro });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isSuperadmin]);

  return (
    <>
      {billingPrompt?.isOwner && !billingPrompt.hasPro ? (
        <Link href="/profile#billing" className="today-btn" title="Owner statements, turnover dispatcher, reports benchmarking">
          ⭐ Go Pro
        </Link>
      ) : null}
      {isStaffUser ? (
        <Dropdown label="Manage" triggerClassName="today-btn" align="left">
          <Link href="/dashboard" className="dropdown-item">
            Dashboard
          </Link>
          <Link href="/reports" className="dropdown-item">
            Reports
          </Link>
          <Link href="/properties" className="dropdown-item">
            Properties
          </Link>
          <Link href="/cleaners" className="dropdown-item">
            Cleaners
          </Link>
          <Link href="/maintenance" className="dropdown-item">
            Maintenance
          </Link>
          <Link href="/supplies" className="dropdown-item">
            Supplies
          </Link>
          {showStatements ? (
            <>
              <Link href="/clients" className="dropdown-item">
                Clients &amp; fees
              </Link>
              <Link href="/payouts" className="dropdown-item">
                Payouts
              </Link>
              <Link href="/statements" className="dropdown-item">
                Owner statements
              </Link>
            </>
          ) : null}
          {isSuperadmin ? (
            <a href="/admin/stats" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Platform stats ↗
            </a>
          ) : null}
          {isSuperadmin ? (
            <a href="/admin/referrals" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Referral credits ↗
            </a>
          ) : null}
        </Dropdown>
      ) : null}
      <Dropdown label="Menu" triggerClassName="today-btn" align="left">
        <Link href="/handbook" className="dropdown-item">
          Handbook
        </Link>
        <Link href="/handbook/cleaners" className="dropdown-item">
          Cleaner quick guide
        </Link>
        <Link href="/history" className="dropdown-item">
          History
        </Link>
        <Link href="/availability" className="dropdown-item">
          Availability
        </Link>
        <Link href="/maintenance" className="dropdown-item">
          Maintenance
        </Link>
        <Link href="/supplies" className="dropdown-item">
          Supplies
        </Link>
        {isStaffUser ? (
          <Link href="/invite" className="dropdown-item">
            Invite team
          </Link>
        ) : null}
        {isStaffUser ? (
          <Link href="/referral" className="dropdown-item">
            Referral
          </Link>
        ) : null}
        <Link href="/profile" className="dropdown-item">
          My Profile
        </Link>
        <Link href="/profile#billing" className="dropdown-item">
          Billing
        </Link>
        <NotificationsToggle className="dropdown-item" />
        <a href="mailto:support@cleancal.net" className="dropdown-item">
          Contact support
        </a>
      </Dropdown>
    </>
  );
}
