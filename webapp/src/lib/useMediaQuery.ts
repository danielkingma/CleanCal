"use client";

import { useSyncExternalStore } from "react";

// useSyncExternalStore (rather than useState+useEffect) sidesteps the
// SSR-mismatch problem entirely: the server snapshot is always `false`,
// and React re-syncs to the real value right after hydration without an
// extra synchronous setState-in-effect render.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
