import webpush from "web-push";
import { createServiceClient } from "./supabase/service";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

function configured(): boolean {
  return Boolean(VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

if (configured()) {
  webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Best-effort delivery: push is a convenience channel layered on top of
// data that already lives in Postgres, not the record of truth, so a
// failure here is swallowed rather than thrown -- an Owner creating a
// booking shouldn't see an error because a cleaner's phone is offline or
// they never enabled notifications.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds));
  if (!configured() || uniqueIds.length === 0) return;

  try {
    const supabase = createServiceClient();
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", uniqueIds);
    if (!subs || subs.length === 0) return;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (err) {
          // 404/410 means the browser dropped this subscription (e.g. the
          // user cleared site data) -- it'll never succeed again, so clean
          // it up. Anything else (a transient network blip) is left alone.
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }),
    );
  } catch {
    // Missing/invalid VAPID env vars or a Supabase error -- never let a
    // notification-delivery problem break the booking action that
    // triggered it.
  }
}
