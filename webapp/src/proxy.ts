import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/cron, /api/webhooks (Stripe), and /api/ical/[token] (the outbound
// .ics export OTAs poll) aren't user-facing at all -- each is hit by
// another server with no session cookie, and authenticates itself a
// different way (CRON_SECRET, a Stripe signature, or an unguessable
// per-property token, respectively). They must stay out of the
// session-required gate below or every request to them just gets
// redirected to /login and never runs.
//
// /manifest.webmanifest and /sw.js are fetched directly by the browser
// (install prompts, service-worker update checks) whether or not anyone
// is signed in -- gating them behind a session redirect breaks
// installability on the login screen and silently breaks the service
// worker's own update checks after a session expires.
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/api/cron",
  "/api/webhooks",
  "/api/ical",
  "/manifest.webmanifest",
  "/sw.js",
];

// The marketing/landing page -- signed out, this is what a visitor to
// the bare domain sees instead of bouncing straight to /login. Checked
// with `===`, never `startsWith`, since "/" is a prefix of every path in
// the app; treating it like the entries above would make everything
// public.

// A signed-in user with no organization yet (a brand-new sign-up -- see
// handle_new_user in supabase/migrations/0001_init.sql, unchanged) needs
// to land on /onboarding to create or join one before anything else
// works; every other query is already scoped to organization_id via RLS
// (0016_organizations.sql), so there's nothing to show them yet anyway.
// /logout stays reachable regardless, same reasoning as /login being
// public -- a user should always be able to sign out.
const ONBOARDING_EXEMPT_PATHS = ["/onboarding", "/logout"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/calendar";
    return NextResponse.redirect(url);
  }

  // Every other redirect above is a pure session check; this one needs a
  // row lookup, so it's scoped as narrowly as possible (skipped entirely
  // for public/onboarding-exempt paths) to avoid an extra query on every
  // request. The reverse case -- an already-onboarded user visiting
  // /onboarding -- is handled by that page itself (same "state-specific
  // redirects live in the page, session checks live here" split the rest
  // of the app already follows, e.g. dashboard/page.tsx's isStaff check).
  const isOnboardingExempt = ONBOARDING_EXEMPT_PATHS.some((p) => path.startsWith(p));
  if (user && !isPublic && !isOnboardingExempt) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.organization_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
