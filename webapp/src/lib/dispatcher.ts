// Turnover dispatcher: ranks a property's cleaners for a job and picks
// the best fit, or returns null when there isn't a good pick -- the
// caller (src/lib/ical-sync.ts) falls back to the existing open job
// board in that case, rather than guessing. Pure data-in/data-out, no
// Supabase here, so it's testable the same way statements.ts and
// conflicts.ts are.
//
// v1 has exactly one ranking signal: how many times a cleaner has
// completed a clean at this exact property (ties broken by most
// recent). There's no proximity signal -- CleanCal has no address/
// location data for properties or cleaners today -- see
// docs/TURNOVER_DISPATCHER.md for what a future version would need.

export interface DispatchCandidate {
  cleanerId: string;
  // Completed cleans on this exact property. 0 means "never cleaned
  // here" -- such a candidate is never picked (see pickCleaner below):
  // assigning a job to someone with zero history here isn't "the right
  // cleaner", it's a guess, and a guess belongs on the open job board
  // where any cleaner can knowingly opt in, not auto-assigned.
  cleaningsAtProperty: number;
  // The most recent of those cleans' check-in dates (an ISO "yyyy-mm-dd"
  // string), for tie-breaking. Null when cleaningsAtProperty is 0.
  lastCleanedDate: string | null;
}

export interface DispatchInput {
  candidates: DispatchCandidate[];
  unavailableCleanerIds: Set<string>;
}

export function pickCleaner(input: DispatchInput): string | null {
  const eligible = input.candidates.filter(
    (c) => c.cleaningsAtProperty > 0 && !input.unavailableCleanerIds.has(c.cleanerId),
  );
  if (eligible.length === 0) return null;
  const ranked = [...eligible].sort((a, b) => {
    if (b.cleaningsAtProperty !== a.cleaningsAtProperty) return b.cleaningsAtProperty - a.cleaningsAtProperty;
    return (b.lastCleanedDate ?? "").localeCompare(a.lastCleanedDate ?? "");
  });
  return ranked[0].cleanerId;
}

// Minimal-disruption reshuffling: a booking that already has a cleaner
// keeps them after a date shift unless they've since marked themselves
// unavailable for the new date -- a cleaner shouldn't lose a job they
// already planned around just because a guest moved their stay by a
// day. Only when this returns false does the caller re-run pickCleaner()
// to find a replacement.
export function shouldKeepCurrentCleaner(cleanerId: string, unavailableCleanerIds: Set<string>): boolean {
  return !unavailableCleanerIds.has(cleanerId);
}
