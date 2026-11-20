"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setLoading(true);
    setError(false);
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
      router.refresh();
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={signOut} disabled={loading} type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50">
        <LogOut size={16} aria-hidden="true" />{loading ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">Could not sign out. Try again.</p>}
    </div>
  );
}
