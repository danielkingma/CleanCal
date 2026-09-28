import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";

const DEVICE_COOKIE = "ccal_device_id";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // ~2 years

function labelFromUserAgent(ua: string | null): string {
  if (!ua) return "a device";
  if (/iPhone/i.test(ua)) return "an iPhone";
  if (/iPad/i.test(ua)) return "an iPad";
  if (/Android/i.test(ua)) return "an Android device";
  if (/Macintosh/i.test(ua)) return "a Mac";
  if (/Windows/i.test(ua)) return "a Windows PC";
  if (/Linux/i.test(ua)) return "a Linux computer";
  return "a device";
}

// Supabase Auth already allows more than one concurrent session per
// account -- a phone and a computer signed in at the same time works with
// no change there. What this adds is device *recognition*: called right
// after a session is established (the magic-link callback, or the typed
// numeric-code fallback), it identifies the browser via a long-lived
// cookie that's independent of the Supabase session itself (so it
// survives signing out and back in on the same browser), and the first
// time a given user+device pairing is seen, records it and notifies the
// account holder -- so a second device showing up is an expected,
// visible thing rather than a silent surprise. Best-effort throughout:
// nothing here should ever be able to block or break a sign-in.
export async function registerDeviceAndNotify(userId: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      cookieStore.set(DEVICE_COOKIE, deviceId, {
        maxAge: DEVICE_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
      });
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("known_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("known_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return;
    }

    // Count devices seen *before* this one -- if this account has never
    // signed in from any device before, this is a first sign-in/sign-up,
    // not "another device," so there's nothing to notify about.
    const { count: priorCount } = await supabase
      .from("known_devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const label = labelFromUserAgent((await headers()).get("user-agent"));
    await supabase.from("known_devices").insert({ user_id: userId, device_id: deviceId, label });

    if (!priorCount) return;

    await notifyUsers([userId], {
      title: "Signed in on a new device",
      body: `Your CleanCal account was just signed in on ${label}. Wasn't you? Open Menu -> My Profile -> "Sign out other devices."`,
    });
  } catch {
    // Device recognition is a convenience, not part of auth itself -- a
    // failure here should never stop or break a real sign-in.
  }
}
