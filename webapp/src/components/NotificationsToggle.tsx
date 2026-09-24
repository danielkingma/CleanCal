"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/notifications/actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type State = "unsupported" | "checking" | "denied" | "subscribed" | "unsubscribed";

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!VAPID_PUBLIC_KEY &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

interface NotificationsToggleProps {
  className?: string;
}

export default function NotificationsToggle({ className = "signout-btn" }: NotificationsToggleProps) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Nothing synchronous here -- the whole point of this effect is to
      // reach into the (async by nature) Service Worker / Push APIs, so
      // every path, including "not supported," is resolved past an await.
      await Promise.resolve();
      if (!isPushSupported()) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!cancelled) setState(existing ? "subscribed" : "unsubscribed");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Malformed push subscription.");
      }
      await savePushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setState("subscribed");
    } catch {
      // Leave the button clickable so the user can retry.
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported" || state === "checking") return null;

  if (state === "denied") {
    return (
      <span
        className={className}
        style={{ opacity: 0.6, cursor: "default" }}
        title="Notifications are blocked in your browser's site settings."
      >
        Notifications blocked
      </span>
    );
  }

  return (
    <button type="button" className={className} disabled={busy} onClick={state === "subscribed" ? handleDisable : handleEnable}>
      {state === "subscribed" ? "Notifications on" : "Enable notifications"}
    </button>
  );
}
