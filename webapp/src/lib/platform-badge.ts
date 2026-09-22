// Small colored badge/stripe per booking source, distinct from
// cleaning-status colors (amber/blue/teal) so the two signals don't
// collide. These are brand-*evocative* colors and a plain letter, not the
// actual Airbnb/Vrbo/Booking.com logos or exact brand hex -- we don't
// have rights to reproduce those marks.
export interface PlatformBadge {
  code: string;
  color: string;
  name: string;
}

const KNOWN_PLATFORMS: Array<{ match: RegExp; badge: PlatformBadge }> = [
  { match: /airbnb/i, badge: { code: "A", color: "#D9304A", name: "Airbnb" } },
  { match: /vrbo|homeaway/i, badge: { code: "V", color: "#5B4EA6", name: "Vrbo" } },
  { match: /booking\.?com/i, badge: { code: "B", color: "#003B95", name: "Booking.com" } },
  { match: /expedia/i, badge: { code: "E", color: "#B8860B", name: "Expedia" } },
  { match: /agoda/i, badge: { code: "Ag", color: "#A6266E", name: "Agoda" } },
  { match: /stayz/i, badge: { code: "S", color: "#0E8C7F", name: "Stayz" } },
  { match: /trip\.?com|ctrip/i, badge: { code: "T", color: "#2577E3", name: "Trip.com" } },
  { match: /xiaozhu/i, badge: { code: "X", color: "#E0607E", name: "Xiaozhu" } },
  { match: /tujia/i, badge: { code: "Tu", color: "#1E8A8A", name: "Tujia" } },
  { match: /9\s?flats/i, badge: { code: "9", color: "#F7931E", name: "9flats" } },
  { match: /casamundo/i, badge: { code: "C", color: "#2E8B57", name: "Casamundo" } },
  { match: /interhome/i, badge: { code: "I", color: "#E4002B", name: "Interhome" } },
  { match: /novasol/i, badge: { code: "N", color: "#2A6F97", name: "NOVASOL" } },
  { match: /home\s?to\s?go/i, badge: { code: "H", color: "#7C3AED", name: "HomeToGo" } },
  { match: /plum\s?guide/i, badge: { code: "P", color: "#8E4585", name: "Plum Guide" } },
  { match: /furnished\s?finder/i, badge: { code: "F", color: "#2E7D32", name: "Furnished Finder" } },
  { match: /houfy/i, badge: { code: "Ho", color: "#17A2B8", name: "Houfy" } },
];

export function getPlatformBadge(label: string | null | undefined): PlatformBadge | null {
  if (!label || !label.trim()) return null;

  for (const { match, badge } of KNOWN_PLATFORMS) {
    if (match.test(label)) return badge;
  }

  // A labeled feed that isn't one of the big three -- a client's own
  // direct-booking site, most likely. Still worth a badge, just neutral.
  return { code: label.trim()[0].toUpperCase(), color: "#5B6560", name: label.trim() };
}
