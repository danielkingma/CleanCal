import { sendPushToUsers, type PushPayload } from "./push";
import { sendSmsToUsers } from "./sms";

// Fans a single event out to every best-effort notification channel a
// user might have opted into -- push (push.ts) and SMS (sms.ts) today.
// Each channel independently checks its own configuration and opt-in
// state and swallows its own failures, so callers (calendar/actions.ts,
// ical-sync.ts) just describe the event once, exactly as they did when
// this only ever meant push.
export async function notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.all([sendPushToUsers(userIds, payload), sendSmsToUsers(userIds, payload)]);
}
