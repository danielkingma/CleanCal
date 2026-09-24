import type { Booking } from "./types";

export const CHECKIN_FRAC = 14 / 24;
export const CHECKOUT_FRAC = 10 / 24;
export const DAY_W_MONTH = 40;
export const DAY_W_WEEK = 130;
export const ROW_H = 42;
export const HEADER_H = 40;
export const LABEL_W = 300;

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
// than a handful of generic line items. Bedroom and Bathroom are
// per-room templates -- buildChecklistSections() below repeats each one
// per the property's own bedroom_count/bathroom_count, so a 1-bed
// apartment gets one Bedroom section and a 3-bed house gets three,
// each tracked independently. Every other section is the same
// regardless of property size. `key` is stored as its own flat boolean
// in `bookings.checklist` (see the Checklist type); the oven alone is
// handled specially in BookingModal (checked + an outcome, not just
// checked) since it's the one item worth flagging for a host's
// attention rather than just ticking off.
const BEDROOM_ITEM_TEMPLATE: ChecklistItemDef[] = [
  { key: "strip_linen", label: "Strip and remove linen (leave mattress protectors if clean)" },
  { key: "linen_laundry", label: "Linen placed in laundry baskets/bags" },
  { key: "make_beds", label: "Beds made with fresh linen" },
  { key: "towels", label: "Fresh rolled towels & washers placed on beds" },
  { key: "surfaces", label: "Surfaces dusted, sprayed & wiped" },
  { key: "mirrors", label: "Mirrors wiped streak-free" },
  { key: "guest_items", label: "Guest items/rubbish removed from the room & cupboards" },
];

// Toilet and bathroom fixtures are cleaned together as one physical
// room, so each bathroom instance gets one combined section rather than
// separate "Toilets" and "Bathrooms" sections repeated in parallel.
const BATHROOM_ITEM_TEMPLATE: ChecklistItemDef[] = [
  { key: "toilet_bowl", label: "Toilet bowl treated, brushed & flushed" },
  { key: "toilet_wipe", label: "Toilet wiped (seat, lid, tank, cover)" },
  { key: "toilet_paper", label: "Toilet paper roll replaced & holder restocked" },
  { key: "linen", label: "Towels, washers & bath mats removed to laundry" },
  { key: "guest_items", label: "Guest items/rubbish removed" },
  { key: "host_supplies", label: "Host-supplied body wash/shampoo/conditioner kept & wiped down" },
  { key: "surfaces", label: "Surfaces dusted, sprayed & wiped (sink, taps, shower, vanity)" },
  { key: "mirrors", label: "Mirrors & shower screens wiped streak-free" },
  { key: "mat", label: "Fresh bath mat placed" },
  { key: "bin", label: "Bin emptied & fresh bag fitted" },
];

const KITCHEN_SECTION: ChecklistSectionDef = {
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
};

const LIVING_SECTION: ChecklistSectionDef = {
  section: "Dining / Living Room",
  items: [
    { key: "living_surfaces", label: "Surfaces dusted, sprayed & wiped" },
    { key: "living_mirrors", label: "Mirrors/glass/TV screens wiped streak-free" },
    { key: "living_arrange", label: "Furniture arranged to match listing photos" },
    { key: "living_guest_items", label: "Guest items/rubbish removed" },
    { key: "living_restock", label: "Tissues & other supplies restocked" },
  ],
};

const FLOORS_SECTION: ChecklistSectionDef = {
  section: "Floors & Carpets",
  items: [
    { key: "floors_pickup", label: "Large items/rubbish picked up" },
    { key: "floors_vacuum", label: "All floors & carpets vacuumed" },
    { key: "floors_mop", label: "Hard floors mopped" },
  ],
};

const OUTDOOR_SECTION: ChecklistSectionDef = {
  section: "Outdoor Areas",
  items: [
    { key: "outdoor_arrange", label: "Outdoor furniture arranged to match listing photos" },
    { key: "outdoor_debris", label: "Debris removed (leaves, dust, dirt)" },
    { key: "outdoor_surfaces", label: "Surfaces dusted, sprayed & wiped" },
  ],
};

const LOCKING_SECTION: ChecklistSectionDef = {
  section: "Locking Up",
  items: [
    { key: "locking_walkthrough", label: "Final walkthrough — clean, arranged, stocked" },
    { key: "locking_lights", label: "All lights turned off" },
    { key: "locking_windows", label: "Windows closed & doors locked" },
    { key: "locking_keys", label: "Keys returned to lockbox/designated spot" },
    { key: "locking_code", label: "Lockbox code reset, if instructed" },
  ],
};

function repeatRoomSection(
  namePrefix: string,
  keyPrefix: string,
  template: ChecklistItemDef[],
  count: number,
): ChecklistSectionDef[] {
  return Array.from({ length: count }, (_, i) => ({
    section: count === 1 ? namePrefix : `${namePrefix} ${i + 1}`,
    items: template.map((item) => ({ key: `${keyPrefix}${i + 1}_${item.key}`, label: item.label })),
  }));
}

// Scales the checklist to the property's own profile: one Bedroom/
// Bathroom section per actual room (bedroom_count/bathroom_count
// default to 1 for a property that's never had these set), and no
// Outdoor Areas section at all unless has_outdoor_area is set. Falls
// back to the same defaults for a booking whose property record is
// missing (e.g. mid-load) so the checklist never renders empty.
export function buildChecklistSections(property?: {
  bedroom_count?: number;
  bathroom_count?: number;
  has_outdoor_area?: boolean;
}): ChecklistSectionDef[] {
  const bedroomCount = Math.max(1, property?.bedroom_count ?? 1);
  const bathroomCount = Math.max(1, property?.bathroom_count ?? 1);
  return [
    ...repeatRoomSection("Bedroom", "bedroom", BEDROOM_ITEM_TEMPLATE, bedroomCount),
    ...repeatRoomSection("Bathroom", "bathroom", BATHROOM_ITEM_TEMPLATE, bathroomCount),
    KITCHEN_SECTION,
    LIVING_SECTION,
    FLOORS_SECTION,
    ...(property?.has_outdoor_area ? [OUTDOOR_SECTION] : []),
    LOCKING_SECTION,
  ];
}
