export type Role = "owner" | "manager" | "cleaner";

// "Staff" = admin-equivalent operational access (matches the database's
// is_admin() function, which now means "owner or manager"). Owner-only
// actions (changing someone's role, deleting a property) check the role
// directly instead.
export function isStaff(role: Role | undefined): boolean {
  return role === "owner" || role === "manager";
}
export function isOwner(role: Role | undefined): boolean {
  return role === "owner";
}

export type BookingStatus = "to-clean" | "in-progress" | "complete";

export type IdentityStatus = "unverified" | "pending" | "verified" | "failed";
export type ConnectStatus = "not_started" | "pending" | "active";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  bio?: string;
  phone?: string;
  service_area?: string;
  identity_status?: IdentityStatus;
  stripe_connect_status?: ConnectStatus;
}

export interface CleanerRating {
  average: number;
  count: number;
}

export interface Property {
  id: string;
  name: string;
  access_instructions?: string;
  payout_rate_cents?: number | null;
}

export type IcalSyncStatus = "never" | "ok" | "error";

export interface IcalFeed {
  id: string;
  property_id: string;
  source_label: string;
  ical_url: string;
  last_synced_at: string | null;
  last_sync_status: IcalSyncStatus;
  last_sync_error: string | null;
}

export interface OvenChecklistEntry {
  checked: boolean;
  outcome: "cleaned" | "attention" | null;
}

// A flat bag of item-key -> checked, one key per CHECKLIST_SECTIONS item
// (calendar-utils.ts) -- stored as-is in the `bookings.checklist` jsonb
// column, so adding/renaming/removing an item there never needs a
// migration. `oven` alone keeps a richer shape (see hasAttention()) so a
// cleaner can flag it as needing follow-up rather than just checked/not.
export interface Checklist {
  oven?: OvenChecklistEntry;
  [itemKey: string]: boolean | OvenChecklistEntry | undefined;
}

export type BookingSource = "manual" | "ical";
export type DisputeStatus = "none" | "open" | "resolved";

export interface DisputeMessage {
  id: string;
  author_name: string;
  author_role: Role;
  body: string;
  created_at: string;
}

export interface Booking {
  id: string;
  property_id: string;
  checkin_date: string; // ISO date, e.g. 2026-01-05
  nights: number;
  status: BookingStatus;
  notes: string;
  guests: string;
  checklist: Checklist;
  assigned_cleaner_id: string | null;
  is_open_job: boolean;
  source?: BookingSource;
  external_uid?: string | null;
  ical_missing_since?: string | null;
  platform_label?: string | null;
  rating?: number | null;
  rating_comment?: string;
  dispute_status: DisputeStatus;
  payout_status?: "none" | "paid";
  stripe_transfer_id?: string | null;
}
