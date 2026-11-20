import { redirect } from "next/navigation";
import { BarChart3, ShieldCheck, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/");

  return (
    <main className="grid min-h-screen bg-[#f6f8fc] lg:grid-cols-[1fr_1fr]">
      <section className="hidden flex-col justify-between bg-[#1f3659] px-12 py-11 text-white lg:flex xl:px-20">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4e8af4] text-xl font-bold">v</span><span className="text-lg font-bold tracking-[-.05em]">vitristyle <span className="font-medium text-[#aebfdc]">Manager</span></span></div>
        <div className="max-w-md"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d4e1f5]">Your private workspace</span><h1 className="mt-6 text-[43px] font-semibold leading-[1.16] tracking-[-.055em]">A clearer view of your business, every day.</h1><p className="mt-6 text-[15px] leading-7 text-[#afc2dd]">Understand sales, monitor inventory, and keep your cash flow organized in one simple place.</p>
          <div className="mt-9 flex gap-3"><span className="rounded-xl bg-white/10 p-3"><BarChart3 size={21}/></span><span className="rounded-xl bg-white/10 p-3"><Wallet size={21}/></span><span className="rounded-xl bg-white/10 p-3"><ShieldCheck size={21}/></span></div>
        </div>
        <p className="text-xs text-[#9cb0d0]">vitristyle · Business management</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563eb] text-xl font-bold text-white">v</span><h1 className="mt-4 text-2xl font-bold tracking-tight">vitristyle Manager</h1></div>
          <p className="vs-eyebrow mb-3">Secure access</p>
          <LoginForm />
          <p className="mt-6 text-center text-xs leading-5 text-[#8b98aa]">Private business workspace. Contact the administrator for access.</p>
        </div>
      </section>
    </main>
  );
}
