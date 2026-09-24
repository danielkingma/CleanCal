import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitors to the bare domain skip the marketing page and go
  // straight back into the app -- proxy.ts already does this same
  // redirect at the middleware level, but a direct render here (rather
  // than relying solely on that) keeps this page correct even if it's
  // ever reached some other way.
  if (user) {
    redirect("/calendar");
  }

  return <LandingPage />;
}
