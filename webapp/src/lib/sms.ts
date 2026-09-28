import { createServiceClient } from "./supabase/service";

// No Twilio SDK dependency -- their REST API is a single authenticated
// POST, and pulling in a whole SDK for one endpoint isn't worth it (same
// reasoning kept push.ts's web-push usage minimal).
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

function configured(): boolean {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

// Exported so the Profile page (a server component, the only place that
// can see non-NEXT_PUBLIC_ env vars) can decide whether to show the SMS
// opt-in checkbox at all -- before Twilio is configured, offering a
// checkbox that silently does nothing is worse than not showing it.
export function smsConfigured(): boolean {
  return configured();
}

// The `phone` field on Profile is free text a person typed into
// ProfileForm.tsx, almost always as a local AU mobile ("04xx xxx xxx")
// rather than E.164 -- Twilio requires E.164. This is a best-guess AU
// normalization, not general phone parsing; anything that doesn't look
// like a plausible AU mobile afterwards is skipped rather than sent to
// Twilio and rejected there. (If CleanCal ever supports hosts/cleaners
// outside Australia, this needs a real phone-parsing library and a
// country on the profile to disambiguate.)
function toE164AU(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+61\d{9}$/.test(digits)) return digits;
  if (/^61\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+61${digits.slice(1)}`;
  return null;
}

export interface SmsPayload {
  title: string;
  body: string;
}

// Best-effort delivery, same posture as sendPushToUsers in push.ts: SMS
// is a convenience channel layered on top of data that already lives in
// Postgres, not the record of truth, so a failure here -- no opt-in, an
// unparseable number, missing Twilio credentials, a Twilio outage -- is
// swallowed rather than thrown. An Owner assigning a job shouldn't see an
// error because a cleaner's phone number has a typo in it.
export async function sendSmsToUsers(userIds: string[], payload: SmsPayload): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds));
  if (!configured() || uniqueIds.length === 0) return;

  try {
    const supabase = createServiceClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone, sms_opt_in")
      .in("id", uniqueIds)
      .eq("sms_opt_in", true);
    if (!profiles || profiles.length === 0) return;

    const text = `CleanCal — ${payload.title}: ${payload.body}`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

    await Promise.all(
      profiles.map(async (p) => {
        const to = toE164AU((p.phone as string | null) ?? "");
        if (!to) return;
        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER!, Body: text }),
            },
          );
          if (!res.ok) {
            // Twilio rejected it (bad number, unverified trial
            // destination, insufficient balance, etc.) -- nothing in
            // Postgres to clean up (unlike push.ts's dead-subscription
            // case), so just drop it.
            console.error("Twilio SMS send failed:", res.status, await res.text());
          }
        } catch (err) {
          console.error("Twilio SMS request failed:", err);
        }
      }),
    );
  } catch {
    // Missing/invalid Twilio env vars or a Supabase error.
  }
}
