# vitristyle Manager — Phase 1 (dashboard)

A responsive, monochrome Next.js dashboard for a small online accessories and innerwear business.

## What is included

- Responsive desktop sidebar and mobile navigation drawer
- Dashboard with four financial KPI cards
- Interactive 7-day / 30-day sample sales chart
- Money received, expenses, and customer payment balance
- Recent sales table, low-stock alerts, expense breakdown
- Working links to dedicated module placeholder routes
- Currency displayed in Nepalese rupees (NPR)

**Important:** This is a frontend DEMO. All amounts and inventory counts are sample data in `src/lib/dashboard-data.ts`. The "Admin" label is a visual placeholder, not an authenticated login. There is no real database connection, payment processing, sales entry, or data persistence in Phase 1.

## Prerequisites

- Node.js LTS (recommended: Node.js 22 or later, subject to the minimum required by your installed Next.js version)
- npm
- Visual Studio Code

## 1. Create a new Next.js starter project

In a VS Code terminal (PowerShell on Windows is fine), from a folder where you keep coding projects:

```powershell
npx create-next-app@latest vitristyle-manager --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd vitristyle-manager
```

If prompted, accept the recommended defaults / continue using the App Router and `src/` directory. The CLI generates the complete build configuration and package.json for your local Next.js version.

## 2. Install dashboard dependencies

```powershell
npm install lucide-react recharts
```

No Supabase package or credentials are needed yet.

## 3. Copy the dashboard source files into your project

Unzip the Phase 1 archive. Copy the **`src` directory inside the archive** into the root of your `vitristyle-manager` project, merging with your existing `src` folder and accepting overwrite for these starter files:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`

Other files under `src/components`, `src/lib` and `src/app/{sales,expenses,inventory,reports,settings}` will be added.

**Do not** delete the starter project's `package.json`, `tsconfig.json`, `postcss.config.mjs`, `next.config.ts`, `next-env.d.ts`, `.gitignore`, or `public` directory.

## 4. Start the development server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

You should see:

1. The vitristyle Manager sidebar (or mobile navigation button)
2. Four monetary summary cards
3. A chart whose 7-day and 30-day buttons really work
4. A customer-payment/cash-movement panel
5. A recent sales table with some pending COD payments
6. Inventory alerts and expense category bars
7. Working navigation to Phase 2–5 module preview pages

## 5. Verify the app

```powershell
npm run lint
npm run build
```

If you see a Next.js message saying a port is already in use, stop other Next.js servers with `Ctrl+C` or use the localhost URL reported in your terminal.

## Project source tree

```text
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   ├── sales/page.tsx
│   ├── expenses/page.tsx
│   ├── inventory/page.tsx
│   ├── reports/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── layout/app-shell.tsx
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   ├── sales-chart.tsx
│   │   ├── cash-flow.tsx
│   │   ├── recent-sales.tsx
│   │   ├── stock-alerts.tsx
│   │   └── expense-summary.tsx
│   └── shared/module-preview.tsx
└── lib/
    ├── dashboard-data.ts
    └── format.ts
```

## Core financial logic

- **Sales** = total value of recorded sales, including COD not collected yet.
- **Money received** = payments actually collected from customers (cash, bank and wallets combined).
- **Operating expenses paid** = cash paid for packaging, advertising and delivery in the demo.
- **Estimated operating profit** = sales − cost of goods sold − operating expenses. This demo omits tax, refund/return effects and other possible costs.
- **Pending customer payments** = sales − collected payments.
- **Net operating cash movement** = collected payments − operating expenses paid. This is **not** a bank balance or total cash flow because inventory purchases, opening balances, account transfers, other inflows/outflows and payable timing are not modeled yet.

When you later build the live version, track sales, individual payment receipts, inventory purchases, stock movements and other cash movements as separate transactions in Supabase.

## Phase 2

- Create a Supabase project
- Configure environment variables with publishable project credentials
- Implement real administrator authentication and protected routes
- Design PostgreSQL tables and row-level security before storing business data
- Replace demo arrays with authenticated database queries

**Do not publish real financial information using this unauthenticated Phase 1 demo.**

## References

- Next.js App Router: https://nextjs.org/docs/app
- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Tailwind CSS + Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Recharts: https://recharts.github.io/
