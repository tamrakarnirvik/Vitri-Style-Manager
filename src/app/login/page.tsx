import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-lg font-bold text-white">v</div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">vitristyle</h1>
          <p className="mt-1 text-sm tracking-wide text-neutral-500">Business Manager</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
          Private workspace. Accounts are created by the business administrator.
        </p>
      </div>
    </main>
  );
}
