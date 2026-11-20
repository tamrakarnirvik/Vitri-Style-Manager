"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError("Incorrect credentials or an account that is not confirmed.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Check your internet connection and Supabase settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="vs-card p-6 shadow-sm sm:p-8">
      <span className="vs-soft-icon mb-5"><LockKeyhole size={18}/></span>
      <h2 className="text-[25px] font-bold tracking-[-.04em] text-[#1f314b]">Welcome back</h2>
      <p className="mt-1.5 text-sm leading-6 text-[#7b889c]">Sign in to access your business dashboard.</p>
      <label htmlFor="email" className="mt-6 block text-sm font-semibold text-[#52647c]">Email address</label>
      <input id="email" type="email" autoComplete="email" required disabled={loading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-[10px] border border-[#e2e9f2] min-h-12 px-3.5 py-3 text-base sm:text-sm text-[#283954] outline-none focus:border-[#729ef2] focus:ring-2 focus:ring-[#e6efff]"/>
      <label htmlFor="password" className="mt-4 block text-sm font-semibold text-[#52647c]">Password</label>
      <input id="password" type="password" autoComplete="current-password" required disabled={loading} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="mt-2 w-full rounded-[10px] border border-[#e2e9f2] min-h-12 px-3.5 py-3 text-base sm:text-sm text-[#283954] outline-none focus:border-[#729ef2] focus:ring-2 focus:ring-[#e6efff]"/>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading} className="vs-btn-primary mt-6 w-full py-3">{loading ? "Signing in…" : "Sign in"}<ArrowRight size={17}/></button>
    </form>
  );
}
