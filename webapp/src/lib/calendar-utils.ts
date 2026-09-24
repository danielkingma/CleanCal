import type { Booking } from "./types";

export const CHECKIN_FRAC = 14 / 24;
export const CHECKOUT_FRAC = 10 / 24;
export const DAY_W_MONTH = 40;
export const DAY_W_WEEK = 130;
export const ROW_H = 42;
export const HEADER_H = 40;
export const LABEL_W = 240;

export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function checkoutDate(b: Pick<Booking, "checkin_date" | "nights">): Date {
  return addDays(fromISO(b.checkin_date), b.nights);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function hasAttention(b: Booking): boolean {
  return b.checklist?.oven?.outcome === "attention";
}

export const STATUS_LABEL: Record<Booking["status"], string> = {
  "to-clean": "To Clean",
  "in-progress": "In Progress",
  complete: "Complete",
};

export const CHECKLIST_ITEMS: Array<{ key: keyof Booking["checklist"]; label: string }> = [
  { key: "kitchen", label: "Kitchen cleaned & wiped down" },
  { key: "bathrooms", label: "Bathrooms cleaned" },
  { key: "beds", label: "Beds made, linens changed" },
  { key: "trash", label: "Trash & recycling removed" },
  { key: "inventory", label: "Inventory restocked (toiletries, coffee, etc.)" },
  { key: "floors", label: "Floors vacuumed / mopped" },
  { key: "cupboards", label: "Cupboards checked & cleaned" },
];
