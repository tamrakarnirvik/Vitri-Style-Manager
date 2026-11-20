import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { formatNPR } from "@/lib/format";

type Props = { received: number; expenses: number; pending: number; purchases: number; refunds: number };
export function CashFlow({ received, expenses, pending, purchases, refunds }: Props) {
  const rows = [
    { label: "Payments received", amount: received },
    { label: "Operating expenses", amount: -expenses },
    { label: "Stock purchases", amount: -purchases },
    { label: "Refunds issued", amount: -refunds },
  ];
  const net = received - expenses - purchases - refunds;
  return (
    <section className="vs-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-[15px] font-bold text-[#26364c]">Cash movement</h2><p className="mt-1 text-xs text-[#8390a2]">Today · recorded business transactions</p></div>
        <span className="vs-soft-icon"><ArrowUpRight size={17}/></span>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-2.5 text-[#708097]">
              <span className={`flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-lg ${row.amount >= 0 ? "bg-[#edfbf5] text-[#198462]" : "bg-[#f2f5fb] text-[#687b99]"}`}>
                {row.amount >= 0 ? <ArrowDownLeft size={15}/> : <ArrowUpRight size={15}/>}
              </span>
              {row.label}
            </span>
            <span className="whitespace-nowrap font-semibold text-[#2b3a50] tabular-nums">{row.amount < 0 ? "−" : "+"}{formatNPR(Math.abs(row.amount))}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-[#eef1f6] pt-5">
        <p className="text-xs font-medium text-[#748298]">Net operating cash movement</p>
        <p className="mt-2 text-[25px] font-bold tracking-tight text-[#213147] tabular-nums">{formatNPR(net)}</p>
        <p className="mt-1 text-[11px] leading-4 text-[#8d99aa]">Excludes opening balances and transfers.</p>
      </div>
      <Link href="/orders" className="mt-5 flex items-center justify-between rounded-xl bg-[#f4f7fd] px-4 py-3 transition-colors hover:bg-[#edf3ff]">
        <span><span className="block text-[11px] font-medium text-[#73839b]">Outstanding payments</span><span className="mt-1 block text-lg font-bold text-[#26477b] tabular-nums">{formatNPR(pending)}</span></span>
        <ChevronRight size={17} className="text-[#5584cf]"/>
      </Link>
    </section>
  );
}
