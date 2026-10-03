"use client";

import Link from "next/link";
import Dropdown from "./Dropdown";
import NotificationsToggle from "./NotificationsToggle";

// The same "Manage" and "Menu" dropdowns CalendarApp's topbar has,
// factored out so every other signed-in page can link to the rest of
// the app too -- previously getting from, say, Reports to Cleaners
// meant going back to the calendar first to reach these menus.
export default function NavMenus({
  isStaffUser,
  isSuperadmin = false,
}: {
  isStaffUser: boolean;
  // Daniel's own account only -- see src/lib/superadmin.ts. Links to the
  // hidden platform-wide stats page, which isn't relevant to any normal
  // Owner/Manager/Cleaner.
  isSuperadmin?: boolean;
}) {
  return (
    <>
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
          {isSuperadmin ? (
            <a href="/admin/stats" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Platform stats ↗
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
        <Link href="/profile" className="dropdown-item">
          My Profile
        </Link>
        <NotificationsToggle className="dropdown-item" />
        <a href="mailto:support@cleancal.net" className="dropdown-item">
          Contact support
        </a>
      </Dropdown>
    </>
  );
}
