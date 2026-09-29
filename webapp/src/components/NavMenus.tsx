"use client";

import Link from "next/link";
import Dropdown from "./Dropdown";
import NotificationsToggle from "./NotificationsToggle";

// The same "Manage" and "Menu" dropdowns CalendarApp's topbar has,
// factored out so every other signed-in page can link to the rest of
// the app too -- previously getting from, say, Reports to Cleaners
// meant going back to the calendar first to reach these menus.
export default function NavMenus({ isStaffUser }: { isStaffUser: boolean }) {
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
        </Dropdown>
      ) : null}
      <Dropdown label="Menu" triggerClassName="today-btn" align="left">
        <Link href="/handbook" className="dropdown-item">
          Handbook
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
      </Dropdown>
    </>
  );
}
