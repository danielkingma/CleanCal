import LoginForm from "@/components/LoginForm";
import { readInviteCookie } from "@/lib/invite-cookie";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackFailed = params.error === "auth";
  // The URL is the primary source (it's what an invite link itself
  // carries); the cookie is only a fallback for when someone reaches this
  // page a second time with no ?invite= of its own -- e.g. reopening
  // cleancal.net fresh to type a sign-in code instead of returning to the
  // original tab. See login/actions.ts's sendMagicLink for where it's set.
  const inviteToken = typeof params.invite === "string" ? params.invite : await readInviteCookie();

  return <LoginForm callbackFailed={callbackFailed} inviteToken={inviteToken} />;
}
