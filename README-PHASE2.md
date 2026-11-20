# vitristyle Manager — Phase 2 (Supabase Auth + schema)

This archive contains the entire Phase 1 source code, moved to the `(protected)` route group, plus Phase 2 authentication, session refresh, and a secure 7-table database schema. The dashboard still uses illustrative sample data.

## Installation (existing Next.js 16 / src/ project)

1. Back up or commit your current Phase 1 source files.
2. Stop the dev server (`Ctrl+C`).
3. **Delete the old** `src/app/page.tsx`, `src/app/sales`, `src/app/expenses`, `src/app/inventory`, `src/app/reports`, and `src/app/settings` folders in your existing app (do not delete `src/app/globals.css`). These routes are now under `src/app/(protected)/`. Leaving both versions will create duplicate route errors.
4. Copy the archive's `src` folder into your project root and merge. Copy its `supabase/schema.sql` into your project, too.
5. Install: `npm install @supabase/supabase-js @supabase/ssr lucide-react recharts`.
6. Copy `.env.local.example` to `.env.local`, and insert your own Project URL and Publishable Key.
7. Supabase Dashboard > SQL Editor > New query: paste `supabase/schema.sql`; click Run **once**, for a fresh project. This script creates 7 tables with per-user RLS policies. Do not rerun if you've already executed it.
8. Supabase Dashboard > Authentication > Sign In / Providers: enable Email, disable public **Allow new users to sign up** / email signups (label varies by dashboard). This demo has no public signup page.
9. Supabase Dashboard > Authentication > Users > Add user: create your administrator email/password (or invite yourself and complete your password setup).
10. Run: `npm run dev`; visit `http://localhost:3000` (redirects to `/login`).
11. Sign in with your Supabase administrator email/password; visit Settings to confirm database reads (`0 products` for new database).
12. Sign out. Test going directly to `/sales` while signed out: should redirect to `/login`.
13. Verify: `npm run lint` then `npm run build`.

## Source tree

```text
src/
  app/
    layout.tsx                 # Root markup only
    globals.css
    login/page.tsx            # Unprotected login
    (protected)/
      layout.tsx              # Authenticated server layout + AppShell
      page.tsx                # Phase 1 dashboard sample
      sales/page.tsx
      expenses/page.tsx
      inventory/page.tsx
      reports/page.tsx
      settings/page.tsx       # Real auth / DB connection status
  components/
    auth/login-form.tsx
    auth/sign-out-button.tsx
    layout/app-shell.tsx      # Updated to show logged-in user and signout
    dashboard/*              # Phase 1 components
    shared/module-preview.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/proxy.ts
    dashboard-data.ts
    format.ts
  proxy.ts                    # Next.js 16 route/session Proxy
supabase/schema.sql
.env.local.example
```

### Next.js versions
This archive is designed for **Next.js 16+** created by a recent `create-next-app` as described in Phase 1. If you use Next.js 15, rename `src/proxy.ts` to `src/middleware.ts` and change exported `proxy` to `middleware` (Supabase client code is unchanged). Do not keep both.

### Security
- Do not use a secret/service-role key in a `NEXT_PUBLIC_` variable.
- RLS is enabled on every table. `anon` permissions are revoked, `authenticated` receives row-limited CRUD permissions.
- Each authenticated account owns its own records. Multiple staff sharing *one* business database needs a membership model in a later phase (not shared passwords).
- The schema includes financial fields but **no** payment processing, automatic inventory adjustment or double-entry ledger yet; do not treat it as accounting-ready.
- Before production, add RLS integration tests, business-specific roles, backups, email confirmation/reset flows and MFA.

References: https://supabase.com/docs/guides/auth/server-side/creating-a-client ; https://supabase.com/docs/guides/database/postgres/row-level-security ; https://nextjs.org/docs/app/getting-started/proxy
