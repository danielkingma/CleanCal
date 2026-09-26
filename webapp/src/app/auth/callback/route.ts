import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/calendar";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Carry an invite token through to the failure redirect too -- otherwise
  // a cleaner whose magic link got silently consumed by their email
  // provider's link-scanning (the exact case the login page's "that sign-in
  // link didn't work" message exists for) loses their invite the moment
  // the link fails, and ends up creating a brand-new business instead of
  // joining the one they were invited to when they retry with a code.
  const failureUrl = new URL("/login", origin);
  failureUrl.searchParams.set("error", "auth");
  const invite = new URL(next, origin).searchParams.get("invite");
  if (invite) failureUrl.searchParams.set("invite", invite);
  return NextResponse.redirect(failureUrl);
}
