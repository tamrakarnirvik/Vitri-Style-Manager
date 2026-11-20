import Link from "next/link";
import { ArrowUpRight, Banknote, ChartNoAxesCombined, CircleDollarSign, Plus, ReceiptText, ShoppingCart } from "lucide-react";
import { getDashboardSummary, getProducts, getSales } from "@/lib/business";
import { formatNPR } from "@/lib/format";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { CashFlow } from "@/components/dashboard/cash-flow";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { ExpenseSummary } from "@/components/dashboard/expense-summary";
import { Reveal } from "@/components/ui/reveal";

export default async function DashboardPage() {
  const [summary, products, sales] = await Promise.all([getDashboardSummary(), getProducts(), getSales()]);
  const profit = summary.sales_today - summary.product_cost_today - summary.expenses_today - summary.write_offs_today;
  return <div>
    <Reveal><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Live business overview</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1><p className="mt-2 text-sm text-neutral-500">Todays finances, stock and pending payments · Nepal time</p></div><div className="flex gap-2"><Link href="/sales" className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-100"><ShoppingCart size={16}/> Sales</Link><Link href="/expenses" className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700"><Plus size={16}/> Expense</Link></div></div></Reveal>
    <Reveal delay={0.06}><div className="mt-6 flex gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-600"><CircleDollarSign className="mt-0.5 shrink-0" size={17}/><p><strong className="text-neutral-900">Live data.</strong> Sales are recorded when confirmed. Money received counts actual payment records. Estimated profit excludes tax and fees and is not a formal accounting report. Full returns and stock write-offs are tracked separately.</p></div></Reveal>
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today's financial metrics">
      <Reveal delay={0.08}><MetricCard label="Today's sales" value={formatNPR(summary.sales_today)} detail={`${summary.orders_today} confirmed orders · may include unpaid sales`} icon={ShoppingCart}/></Reveal>
      <Reveal delay={0.12}><MetricCard label="Money received" value={formatNPR(summary.received_today)} detail="Customer payments collected today" icon={Banknote}/></Reveal>
      <Reveal delay={0.16}><MetricCard label="Operating expenses" value={formatNPR(summary.expenses_today)} detail="Business expenses paid today" icon={ReceiptText}/></Reveal>
      <Reveal delay={0.2}><MetricCard label="Estimated profit" value={formatNPR(profit)} detail="Sales − product cost − expenses − write-offs" icon={ChartNoAxesCombined}/></Reveal>
    </section>
    <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]"><Reveal delay={0.14}><SalesChart days={summary.chart}/></Reveal><Reveal delay={0.18}><CashFlow received={summary.received_today} expenses={summary.expenses_today} pending={summary.pending_total} purchases={summary.purchases_today} refunds={summary.refunds_today}/></Reveal></div>
    <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]"><Reveal delay={0.18}><RecentSales sales={sales}/></Reveal><div className="grid gap-5"><Reveal delay={0.22}><StockAlerts products={products}/></Reveal><Reveal delay={0.26}><ExpenseSummary categories={summary.expense_categories}/></Reveal></div></div>
    <p className="mt-7 flex items-center gap-2 text-xs text-neutral-500"><ArrowUpRight size={14}/> Use Accounts for cash and bank balances, Inventory for restocking, and Reports for date-range exports. Review reconciliations against statements.</p>
  </div>;
}
