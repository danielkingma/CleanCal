import LoginForm from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackFailed = params.error === "auth";

  return <LoginForm callbackFailed={callbackFailed} />;
}
