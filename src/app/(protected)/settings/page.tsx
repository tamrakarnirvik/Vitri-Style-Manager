import { Database, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: identity } = await supabase.auth.getClaims();
  const email = typeof identity?.claims?.email === "string" ? identity.claims.email : "Administrator";
  const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.16em] text-neutral-400 uppercase">Business configuration</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-neutral-500">Your private account and database connection status.</p>

      <div className="mt-7 grid gap-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-3"><UserRound size={19} /><h2 className="font-semibold">Signed-in account</h2></div>
          <p className="mt-3 break-all text-sm text-neutral-700">{email}</p>
          <p className="mt-2 text-xs text-neutral-500">Account authentication is managed by Supabase Auth.</p>
        </section>
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-3"><Database size={19} /><h2 className="font-semibold">Database connection</h2></div>
          {error ? (
            <div role="alert" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Products table could not be read. Confirm that the SQL schema was run and that its RLS policies are enabled.
              <p className="mt-2 font-mono text-xs">{error.message}</p>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700"><ShieldCheck size={18} />Connected · {count ?? 0} products in your database</div>
          )}
          <p className="mt-3 text-xs text-neutral-500">This reads the real database. The dashboard now shows live financial records after the Phase 3 migration.</p>
        </section>
      </div>
    </div>
  );
}
