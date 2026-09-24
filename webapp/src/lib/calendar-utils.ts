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

export interface ChecklistItemDef {
  key: string;
  label: string;
}
export interface ChecklistSectionDef {
  section: string;
  items: ChecklistItemDef[];
}

// Room-by-room, matching a real professional turnover checklist rather
// than a handful of generic line items -- each `key` is stored as its
// own flat boolean in `bookings.checklist` (see the Checklist type).
// `kitchen_oven` alone is handled specially in BookingModal (checked +
// an outcome, not just checked) since it's the one item worth flagging
// for a host's attention rather than just ticking off.
export const CHECKLIST_SECTIONS: ChecklistSectionDef[] = [
  {
    section: "Bedrooms",
    items: [
      { key: "bedrooms_strip_linen", label: "Strip and remove linen (leave mattress protectors if clean)" },
      { key: "bedrooms_linen_laundry", label: "Linen placed in laundry baskets/bags" },
      { key: "bedrooms_make_beds", label: "Beds made with fresh linen" },
      { key: "bedrooms_towels", label: "Fresh rolled towels & washers placed on beds" },
      { key: "bedrooms_surfaces", label: "Surfaces dusted, sprayed & wiped" },
      { key: "bedrooms_mirrors", label: "Mirrors wiped streak-free" },
      { key: "bedrooms_guest_items", label: "Guest items/rubbish removed from bedrooms & cupboards" },
    ],
  },
  {
    section: "Toilets",
    items: [
      { key: "toilets_bowl", label: "Toilet bowl treated, brushed & flushed" },
      { key: "toilets_wipe", label: "Bowl & tank wiped (seat, lid, tank, cover)" },
      { key: "toilets_paper", label: "Toilet paper roll replaced & holder restocked" },
      { key: "toilets_bin", label: "Bin emptied & fresh bag fitted" },
    ],
  },
  {
    section: "Bathrooms",
    items: [
      { key: "bathrooms_linen", label: "Towels, washers & bath mats removed to laundry" },
      { key: "bathrooms_guest_items", label: "Guest items/rubbish removed" },
      { key: "bathrooms_host_supplies", label: "Host-supplied body wash/shampoo/conditioner kept & wiped down" },
      { key: "bathrooms_surfaces", label: "Surfaces dusted, sprayed & wiped (sink, taps, shower, vanity)" },
      { key: "bathrooms_mirrors", label: "Mirrors & shower screens wiped streak-free" },
      { key: "bathrooms_mat", label: "Fresh bath mat placed" },
    ],
  },
  {
    section: "Kitchen",
    items: [
      { key: "kitchen_dishwasher", label: "Dishwasher checked, dishes put away" },
      { key: "kitchen_bin", label: "Bin emptied & fresh bag fitted" },
      { key: "kitchen_fridge", label: "Fridge checked, food restocked/discarded" },
      { key: "kitchen_appliances", label: "Appliances cleaned (fridge, dishwasher, microwave, kettle, toaster)" },
      { key: "kitchen_restock", label: "Coffee/tea/sugar/biscuits restocked" },
      { key: "kitchen_sponges", label: "Sponges/scourers replaced & restocked" },
      { key: "kitchen_arrange", label: "Furniture/appliances arranged to match listing photos" },
      { key: "kitchen_cupboards", label: "Cupboards/drawers checked for guest items/rubbish" },
    ],
  },
  {
    section: "Dining / Living Room",
    items: [
      { key: "living_surfaces", label: "Surfaces dusted, sprayed & wiped" },
      { key: "living_mirrors", label: "Mirrors/glass/TV screens wiped streak-free" },
      { key: "living_arrange", label: "Furniture arranged to match listing photos" },
      { key: "living_guest_items", label: "Guest items/rubbish removed" },
      { key: "living_restock", label: "Tissues & other supplies restocked" },
    ],
  },
  {
    section: "Floors & Carpets",
    items: [
      { key: "floors_pickup", label: "Large items/rubbish picked up" },
      { key: "floors_vacuum", label: "All floors & carpets vacuumed" },
      { key: "floors_mop", label: "Hard floors mopped" },
    ],
  },
  {
    section: "Outdoor Areas",
    items: [
      { key: "outdoor_arrange", label: "Outdoor furniture arranged to match listing photos" },
      { key: "outdoor_debris", label: "Debris removed (leaves, dust, dirt)" },
      { key: "outdoor_surfaces", label: "Surfaces dusted, sprayed & wiped" },
    ],
  },
  {
    section: "Locking Up",
    items: [
      { key: "locking_walkthrough", label: "Final walkthrough — clean, arranged, stocked" },
      { key: "locking_lights", label: "All lights turned off" },
      { key: "locking_windows", label: "Windows closed & doors locked" },
      { key: "locking_keys", label: "Keys returned to lockbox/designated spot" },
      { key: "locking_code", label: "Lockbox code reset, if instructed" },
    ],
  },
];
