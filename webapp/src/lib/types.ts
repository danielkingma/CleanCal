export type Role = "admin" | "cleaner";

export type BookingStatus = "to-clean" | "in-progress" | "complete";

export interface Profile {
  id: string;
  name: string;
  role: Role;
}

export interface Property {
  id: string;
  name: string;
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

export interface Booking {
  id: string;
  property_id: string;
  checkin_date: string; // ISO date, e.g. 2026-01-05
  nights: number;
  status: BookingStatus;
  notes: string;
  checklist: Checklist;
  assigned_cleaner_id: string | null;
}
