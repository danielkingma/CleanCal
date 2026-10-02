"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

// Chrome/Edge/Android fire this instead of just letting the page sit there --
// capturing it is what lets a page show its own "Install app" button that
// pops the real native install dialog, rather than sending someone hunting
// through a browser menu for "Add to Home screen" themselves. Not part of
// the DOM lib's event types yet, so it's typed by hand here.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "Macintosh" with touch support, not "iPad" --
  // maxTouchPoints is what actually tells a touch Mac from a real one.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own long-standing (non-standard) flag -- not in the DOM
    // lib's Navigator type.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Shown once, right after a new person joins, instead of leaving them to
// stumble onto the Handbook's install steps on their own. Skips itself
// entirely for anyone already running the installed app, and for a desktop
// browser where "install to home screen" doesn't apply.
export default function InstallAppStep({ onContinue }: { onContinue: () => void }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      onContinue();
      return;
    }
    setPlatform(detectPlatform());

    function handlePrompt(e: Event) {
      // Stops Chrome's own mini-infobar from also showing up alongside this
      // step's button -- one install prompt, not two competing ones.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
    // onContinue is a fresh closure each render from the caller, but it's
    // only ever meant to run once on mount here -- re-running it on every
    // parent re-render would fire the standalone check repeatedly for no
    // reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  // Still detecting on first render -- avoid a flash of the wrong
  // platform's steps.
  if (platform === null) return null;

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <div className="brand">
          <Logo />
          Clean<span>Cal</span>
        </div>
        <p className="auth-sub">
          {installed
            ? "Installed! Open the CleanCal icon from your home screen any time."
            : "Install CleanCal on your phone so it works like a real app, with its own icon and job alerts."}
        </p>

        {!installed && platform === "android" && deferredPrompt ? (
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={handleInstallClick} disabled={installing}>
            {installing ? "Installing…" : "Install app"}
          </button>
        ) : null}

        {!installed && platform === "android" && !deferredPrompt ? (
          <ol className="hb-step-list">
            <li>
              Tap <span className="hb-kbd-chip">Install app</span> if Chrome is offering it (usually
              an icon in the address bar) — otherwise open the ⋮ menu in the top-right.
            </li>
            <li>
              Tap <span className="hb-kbd-chip">Add to Home screen</span> or{" "}
              <span className="hb-kbd-chip">Install app</span>, then confirm.
            </li>
          </ol>
        ) : null}

        {!installed && platform === "ios" ? (
          <ol className="hb-step-list">
            <li>Tap the Share icon (the square with an arrow pointing up) in Safari&apos;s toolbar.</li>
            <li>
              Scroll down and tap <span className="hb-kbd-chip">Add to Home Screen</span>, then tap{" "}
              <span className="hb-kbd-chip">Add</span>.
            </li>
          </ol>
        ) : null}

        {!installed && platform === "other" ? (
          <p className="auth-sub" style={{ margin: 0 }}>
            Open <span className="hb-kbd-chip">cleancal.net</span> on your phone to install it there
            — on this device you can just carry on in the browser.
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: 16 }}
          onClick={onContinue}
        >
          {installed ? "Continue to calendar" : "I'll do this later"}
        </button>
      </div>
    </div>
  );
}
