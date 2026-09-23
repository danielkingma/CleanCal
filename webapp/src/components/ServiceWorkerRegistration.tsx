"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Not fatal -- the app works fine without offline caching / push,
        // it just won't be installable as a PWA in that browser.
      });
    }
  }, []);

  return null;
}
