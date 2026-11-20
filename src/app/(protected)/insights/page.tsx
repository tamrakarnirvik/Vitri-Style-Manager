import Link from "next/link";
import { ArrowRight, BarChart3, CalendarRange, CircleHelp, PackageSearch, TrendingUp, Wallet } from "lucide-react";
import { getDashboardSummary, getProducts, getSales } from "@/lib/business";
import { formatNPR } from "@/lib/format";
import { Reveal } from "@/components/ui/reveal";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { CategoryInventory } from "@/components/insights/category-inventory";
import { OrderHealth } from "@/components/insights/order-health";

export default async function InsightsPage() {
  const [summary, products, sales] = await Promise.all([getDashboardSummary(), getProducts(), getSales()]);
  const days = summary.chart;
  const total30 = days.reduce((sum, day) => sum + day.sales, 0);
  const last7 = days.slice(-7).reduce((sum, day) => sum + day.sales, 0);
  const prev7 = days.slice(-14, -7).reduce((sum, day) => sum + day.sales, 0);
  const dailyAverage = days.length ? total30 / days.length : 0;
  const activeDays = days.filter((day) => day.sales > 0).length;
  const lowProducts = products.filter((p) => p.is_active && p.stock_quantity <= 5).length;
  const trendLabel = prev7 > 0 ? `${((last7 - prev7) / prev7 * 100).toFixed(1)}% vs previous 7 days` : "No comparable previous-week baseline";

  return (
    <div className="space-y-5 sm:space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="vs-eyebrow">Analytics / Business intelligence</p>
            <h1 className="mt-2 text-[30px] font-bold tracking-[-.055em] text-[#1e2d44] sm:text-[36px]">Insights</h1>
            <p className="mt-1.5 text-sm leading-6 text-[#77869b]">Understand patterns in sales and stock without losing sight of cash collection.</p>
          </div>
          <Link href="/reports" className="vs-btn-secondary"><CalendarRange size={16}/> Date-range reports <ArrowRight size={15}/></Link>
        </div>
      </Reveal>
      <Reveal delay={.03}>
        <div className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
          {[
            {label:"Last 30-day sales",value:formatNPR(total30),note:"Non-cancelled sales",icon:BarChart3},
            {label:"Last 7-day sales",value:formatNPR(last7),note:trendLabel,icon:TrendingUp},
            {label:"Average daily sales",value:formatNPR(dailyAverage),note:`Across ${days.length} calendar days`,icon:CalendarRange},
            {label:"Low-stock products",value:String(lowProducts),note:"Active SKUs with 5 units or less",icon:PackageSearch},
          ].map(({label,value,note,icon:Icon}) => (
            <div key={label} className="vs-card vs-card-hover p-5">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-[#74839b]">{label}</p><Icon size={17} className="text-[#4d79c5]"/></div>
              <p className="mt-3 text-[25px] font-bold tracking-[-.045em] text-[#22334c] tabular-nums">{value}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[#92a0b2]">{note}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(285px,1fr)]">
        <Reveal delay={.08}><SalesChart days={days} initialRange={30}/></Reveal>
        <Reveal delay={.12}>
          <section className="vs-card flex h-full flex-col p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-[#26364c]">Collection health</h2>
            <p className="mt-1 text-xs text-[#8390a2]">Customer payments still outstanding</p>
            <div className="mt-6 rounded-xl bg-[#eef5ff] p-4"><Wallet size={18} className="text-[#467bdb]"/><p className="mt-3 text-[11px] font-semibold text-[#6381b2]">All active orders</p><p className="mt-1 text-[27px] font-bold tracking-tight text-[#204f9b] tabular-nums">{formatNPR(summary.pending_total)}</p></div>
            <p className="mt-5 text-xs leading-6 text-[#7c8b9f]">This is money customers still owe, not cash available to spend. Record COD payments only after funds are actually received.</p>
            <Link href="/orders" className="vs-btn-secondary mt-auto w-full">Open orders <ArrowRight size={15}/></Link>
          </section>
        </Reveal>
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Reveal delay={.12}><CategoryInventory products={products}/></Reveal>
        <Reveal delay={.15}><OrderHealth sales={sales} activeDays={activeDays} daysCount={days.length}/></Reveal>
      </div>
      <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-[#8290a4]"><CircleHelp size={15} className="mt-[2px] shrink-0"/>The chart covers the last 30 Nepal calendar days. Inventory insights use up to 500 loaded products; order-health counts use up to 100 recent sales. These are descriptive operational metrics, not forecasts or audited financial statements.</p>
    </div>
  );
}
