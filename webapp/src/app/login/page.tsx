import LoginForm from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackFailed = params.error === "auth";
  const inviteToken = typeof params.invite === "string" ? params.invite : null;

  return <LoginForm callbackFailed={callbackFailed} inviteToken={inviteToken} />;
}
