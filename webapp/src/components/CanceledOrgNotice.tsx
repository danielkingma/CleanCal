import Link from "next/link";

// Shown to every member of a canceled org (not just owners/managers, unlike
// TrialNotice) -- the database-level lockout in
// 0061_canceled_org_lockout.sql applies to cleaners' actions too (marking a
// booking complete, uploading photos), so everyone needs to know why
// something just failed. Not dismissible, unlike TrialNotice's countdown --
// this describes an active restriction, not a one-time heads up, so it
// should keep showing until the org is actually reactivated.
export default function CanceledOrgNotice({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="trial-notice ended">
      <span>
        This organization&apos;s subscription has been canceled, so changes are turned off --
        existing data is still here and visible, but creating, editing, or deleting anything
        (bookings, properties, photos, and the like) is blocked until it&apos;s reactivated.{" "}
        {isOwner ? (
          <>
            Head to <Link href="/profile#billing">My Profile → Billing</Link> to resubscribe.
          </>
        ) : (
          "Ask your organization's owner to resubscribe from their Billing page."
        )}
      </span>
    </div>
  );
}
