
import type { ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Ensure authenticated pages render at request time.
  // This prevents Next.js 16 from prerendering
  // request-dependent Supabase authentication.

  await connection();

  // Create authenticated Supabase server client.
  const supabase = await createClient();

  // Verify the current user's authentication claims.
  const { data, error } = await supabase.auth.getClaims();

  // Redirect visitors who aren't authenticated.
  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  // Retrieve the signed-in user's email.
  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Admin";

  // Render the existing dashboard and navigation.
  return (
    <AppShell email={email}>
      {children}
    </AppShell>
  );
}
