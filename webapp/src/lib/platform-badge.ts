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
