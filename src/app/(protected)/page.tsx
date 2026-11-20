import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Banknote,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Plus,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";
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
  const [summary, products, sales] = await Promise.all([
    getDashboardSummary(), getProducts(), getSales(),
  ]);
  const profit = summary.sales_today - summary.product_cost_today - summary.expenses_today - summary.write_offs_today;
  const sales30 = summary.chart.reduce((sum, day) => sum + day.sales, 0);
  const lowStockCount = products.filter((product) => product.is_active && product.stock_quantity <= 5).length;
  return (
    <div className="space-y-5 sm:space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="vs-eyebrow">Business overview / Nepal time</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-.055em] text-[#1e2d44] sm:text-[36px]">Overview</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#77869b]">Your sales, cash movement and inventory in one calm workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/reports" className="vs-btn-secondary"><ArrowDownToLine size={15}/> Reports</Link>
            <Link href="/sales" className="vs-btn-primary"><Plus size={16}/> Record sale</Link>
          </div>
        </div>
      </Reveal>

      <Reveal delay={.03}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfebff] bg-[#eef5ff] px-4 py-3 text-[12px] text-[#42689f]">
          <span className="flex items-center gap-2"><CircleHelp size={15} className="shrink-0"/><span><strong>Financial clarity:</strong> a sale is not cash received. Figures are recorded transactions, not audited accounts.</span></span>
          <Link href="/insights" className="inline-flex items-center gap-1 font-semibold text-[#255fbe] hover:text-[#154593]">Open insights <ChevronRight size={14}/></Link>
        </div>
      </Reveal>

      <section aria-label="Today’s financial metrics" className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={.05}><MetricCard label="Today's sales" value={formatNPR(summary.sales_today)} detail={`${summary.orders_today} active orders · includes unpaid sales`} icon={ShoppingBag} emphasis="primary"/></Reveal>
        <Reveal delay={.08}><MetricCard label="Money received" value={formatNPR(summary.received_today)} detail="Actual customer payments today" icon={Banknote}/></Reveal>
        <Reveal delay={.11}><MetricCard label="Operating expenses" value={formatNPR(summary.expenses_today)} detail="Expenses recorded as paid today" icon={ReceiptText}/></Reveal>
        <Reveal delay={.14}><MetricCard label="Estimated profit" value={formatNPR(profit)} detail="Sales less cost, expenses and write-offs" icon={ChartNoAxesCombined}/></Reveal>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,1fr)]">
        <Reveal delay={.13}><SalesChart days={summary.chart}/></Reveal>
        <Reveal delay={.17}><CashFlow received={summary.received_today} expenses={summary.expenses_today} pending={summary.pending_total} purchases={summary.purchases_today} refunds={summary.refunds_today}/></Reveal>
      </div>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,1fr)]">
        <Reveal delay={.16}><RecentSales sales={sales}/></Reveal>
        <div className="grid gap-4">
          <Reveal delay={.19}><StockAlerts products={products}/></Reveal>
          <Reveal delay={.22}><ExpenseSummary categories={summary.expense_categories}/></Reveal>
        </div>
      </div>

      <Reveal delay={.2}>
        <section className="vs-card grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="vs-eyebrow">Performance at a glance</p>
            <div className="mt-2 flex flex-wrap gap-x-7 gap-y-2">
              <div><p className="text-[11px] text-[#8492a7]">Last 30-day sales</p><p className="mt-1 text-lg font-bold text-[#2b3c55] tabular-nums">{formatNPR(sales30)}</p></div>
              <div><p className="text-[11px] text-[#8492a7]">Active low-stock products</p><p className="mt-1 text-lg font-bold text-[#2b3c55] tabular-nums">{lowStockCount}</p></div>
              <div><p className="text-[11px] text-[#8492a7]">Outstanding payments</p><p className="mt-1 text-lg font-bold text-[#2b3c55] tabular-nums">{formatNPR(summary.pending_total)}</p></div>
            </div>
          </div>
          <Link href="/insights" className="vs-btn-secondary"><BarChart3 size={16}/> Explore insights <ArrowRight size={15}/></Link>
        </section>
      </Reveal>
      <p className="flex items-center gap-2 px-1 text-[11px] leading-5 text-[#91a0b2]"><Wallet size={13}/> Income and profit are estimates. Check Accounts for balances and Reports for date-range exports.</p>
    </div>
  );
}
