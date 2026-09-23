import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/cron isn't user-facing at all -- it's hit by Vercel Cron with no
// session cookie, and authenticates itself via CRON_SECRET instead (see
// src/app/api/cron/sync-ical/route.ts). It must stay out of the
// session-required gate below or Cron's requests just get redirected to
// /login and never run.
//
// /manifest.webmanifest and /sw.js are fetched directly by the browser
// (install prompts, service-worker update checks) whether or not anyone
// is signed in -- gating them behind a session redirect breaks
// installability on the login screen and silently breaks the service
// worker's own update checks after a session expires.
const PUBLIC_PATHS = ["/login", "/auth", "/api/cron", "/manifest.webmanifest", "/sw.js"];

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
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/calendar";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
