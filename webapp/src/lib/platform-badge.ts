// Small colored badge/stripe per booking source, distinct from
// cleaning-status colors (amber/blue/teal) so the two signals don't
// collide. This is a plain letter on a color, never the actual logo/mark.
// Where a platform's own brand color is well-documented publicly (its
// press kit, or widely cited by independent brand-color references), we
// use that real color -- purely to identify the source at a glance, the
// same way a "connect your calendar" button elsewhere on the web does.
// Where no such public source was found, the color below is our own
// evocative approximation instead of a real brand color.
export interface PlatformBadge {
  code: string;
  color: string;
  name: string;
}

const KNOWN_PLATFORMS: Array<{ match: RegExp; badge: PlatformBadge }> = [
  // Publicly documented brand colors:
  { match: /airbnb/i, badge: { code: "A", color: "#FF5A5F", name: "Airbnb" } },
  { match: /vrbo|homeaway/i, badge: { code: "V", color: "#245ABC", name: "Vrbo" } },
  { match: /booking\.?com/i, badge: { code: "B", color: "#003580", name: "Booking.com" } },
  { match: /expedia/i, badge: { code: "E", color: "#FEBF4F", name: "Expedia" } },
  { match: /agoda/i, badge: { code: "Ag", color: "#04A9DF", name: "Agoda" } },
  { match: /trip\.?com|ctrip/i, badge: { code: "T", color: "#287DFA", name: "Trip.com" } },
  { match: /trip\s?advisor|flipkey/i, badge: { code: "Tr", color: "#34E0A1", name: "Tripadvisor Rentals" } },
  { match: /marriott/i, badge: { code: "M", color: "#B41F3A", name: "Marriott Homes & Villas" } },
  // No public brand-color source found -- evocative approximations:
  { match: /stayz/i, badge: { code: "S", color: "#0E8C7F", name: "Stayz" } },
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
  { match: /sonder/i, badge: { code: "Sn", color: "#9F1239", name: "Sonder" } },
  { match: /vacasa/i, badge: { code: "Vc", color: "#059669", name: "Vacasa" } },
  { match: /onefinestay|one\s?fine\s?stay/i, badge: { code: "Of", color: "#4C1D3D", name: "onefinestay" } },
  { match: /turnkey/i, badge: { code: "Tk", color: "#0F766E", name: "TurnKey" } },
  { match: /wimdu/i, badge: { code: "W", color: "#D97706", name: "Wimdu" } },
];

// Every badge this module recognizes by name, in the same order they're
// checked in -- used to list them all out (e.g. the calendar legend's
// "For more" dropdown) rather than just matching one label at a time.
export const ALL_PLATFORM_BADGES: PlatformBadge[] = KNOWN_PLATFORMS.map((p) => p.badge);

export function getPlatformBadge(label: string | null | undefined): PlatformBadge | null {
  if (!label || !label.trim()) return null;

  for (const { match, badge } of KNOWN_PLATFORMS) {
    if (match.test(label)) return badge;
  }

  // A labeled feed that isn't one of the big three -- a client's own
  // direct-booking site, most likely. Still worth a badge, just neutral.
  return { code: label.trim()[0].toUpperCase(), color: "#5B6560", name: label.trim() };
}
