export type Role = "admin" | "cleaner";

export type BookingStatus = "to-clean" | "in-progress" | "complete";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  bio?: string;
  phone?: string;
  service_area?: string;
}

export interface CleanerRating {
  average: number;
  count: number;
}

export interface Property {
  id: string;
  name: string;
  access_instructions?: string;
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

export interface Checklist {
  kitchen?: boolean;
  bathrooms?: boolean;
  beds?: boolean;
  trash?: boolean;
  inventory?: boolean;
  floors?: boolean;
  cupboards?: boolean;
  oven?: OvenChecklistEntry;
}

export type BookingSource = "manual" | "ical";

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
}
