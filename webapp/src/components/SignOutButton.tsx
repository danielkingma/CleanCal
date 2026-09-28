// A plain <form method="post"> needs no client JS, so this has no "use
// client" directive and drops into a server component's topbar (most
// pages) or a client component's card (OnboardingForm) the same way.
// Posts to src/app/logout/route.ts, which signs out and redirects to
// /login. Previously only CalendarApp's topbar had this -- every other
// signed-in page (dashboard, cleaners, properties, reports, history,
// availability, profile, onboarding) had no way to sign out without
// navigating back to the calendar first.
export default function SignOutButton() {
  return (
    <form action="/logout" method="post">
      <button type="submit" className="signout-btn">
        Sign out
      </button>
    </form>
  );
}
