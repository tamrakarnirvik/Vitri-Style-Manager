"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Incorrect credentials or an account that is not confirmed.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not connect. Check your internet connection and Supabase settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-neutral-900">Welcome back</h2>
      <p className="mt-1 text-sm text-neutral-500">Sign in to access your business dashboard.</p>

      <label htmlFor="email" className="mt-6 block text-sm font-medium text-neutral-700">Email address</label>
      <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
        className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200" placeholder="your@email.com" />

      <label htmlFor="password" className="mt-4 block text-sm font-medium text-neutral-700">Password</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
        className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200" placeholder="Enter password" />

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={loading} className="mt-6 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
