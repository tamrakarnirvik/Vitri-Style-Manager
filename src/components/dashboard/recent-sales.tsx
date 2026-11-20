import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SaleRow } from "@/lib/business";
import { formatNPR } from "@/lib/format";

export function RecentSales({ sales }: { sales: SaleRow[] }) {
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-5 sm:px-6"><div><h2 className="text-base font-semibold">Recent sales</h2><p className="mt-1 text-xs text-neutral-500">Latest recorded orders</p></div><Link href="/sales" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900">View all <ArrowUpRight size={15} /></Link></div>
    {sales.length === 0 ? <p className="px-6 py-12 text-sm text-neutral-500">No sales recorded yet. Add a product, then create your first sale.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm">
      <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-6 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Total</th><th className="px-6 py-3 font-medium">Payment</th></tr></thead>
      <tbody className="divide-y divide-neutral-100">{sales.slice(0,6).map((s) => {
        const closed = s.status === "returned" || s.status === "cancelled";
        const remaining = closed ? 0 : Math.max(0, s.grand_total - s.collected);
        return <tr key={s.id} className="transition-colors hover:bg-neutral-50/80"><td className="px-6 py-4 font-semibold">{s.order_number}</td><td className="px-4 py-4 text-neutral-600">{s.customer_name ?? "Online customer"}</td><td className="px-4 py-4 font-semibold tabular-nums">{formatNPR(s.grand_total)}</td><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${closed ? "bg-neutral-100 text-neutral-700" : remaining > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{closed ? s.status : remaining > 0 ? `${formatNPR(remaining)} due` : "Paid"}</span></td></tr>;
      })}</tbody>
    </table></div>}
  </section>;
}
