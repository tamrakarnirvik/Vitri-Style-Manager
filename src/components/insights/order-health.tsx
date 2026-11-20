import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { SaleRow } from "@/lib/business";

export function OrderHealth({ sales, activeDays, daysCount }: { sales: SaleRow[]; activeDays: number; daysCount: number }) {
  const paid = sales.filter((sale) => !["cancelled", "returned"].includes(sale.status) && sale.collected >= sale.grand_total).length;
  const due = sales.filter((sale) => !["cancelled", "returned"].includes(sale.status) && sale.collected < sale.grand_total).length;
  const reversed = sales.filter((sale) => ["cancelled", "returned"].includes(sale.status)).length;
  const items = [
    { label: "Fully collected", value: paid, icon: CheckCircle2, color: "text-[#218762]", background: "bg-[#eaf8f3]" },
    { label: "Payment outstanding", value: due, icon: Clock3, color: "text-[#b38234]", background: "bg-[#fff6e9]" },
    { label: "Cancelled or returned", value: reversed, icon: XCircle, color: "text-[#6b7890]", background: "bg-[#f1f4f8]" },
  ];
  return (
    <section className="vs-card h-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-bold text-[#26364c]">Order collection status</h2><p className="mt-1 text-xs text-[#8390a2]">Most recent {sales.length} orders (up to 100)</p></div><Link href="/orders" className="text-[#3064bb]" aria-label="View orders"><ArrowUpRight size={17}/></Link></div>
      <div className="mt-6 space-y-3">
        {items.map(({label,value,icon:Icon,color,background}) => <div key={label} className="flex items-center justify-between rounded-xl border border-[#edf1f6] px-3.5 py-3"><span className="flex items-center gap-3 text-xs font-medium text-[#5f7088]"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${background} ${color}`}><Icon size={16}/></span>{label}</span><span className="text-[17px] font-bold text-[#314765] tabular-nums">{value}</span></div>)}
      </div>
      <div className="mt-5 border-t border-[#edf1f6] pt-4"><p className="text-[11px] text-[#8493a7]">Days with recorded sales</p><p className="mt-1 text-[20px] font-bold text-[#2c415f] tabular-nums">{activeDays}<span className="text-[13px] font-medium text-[#9ba7b9]"> / {daysCount} days</span></p></div>
    </section>
  );
}
