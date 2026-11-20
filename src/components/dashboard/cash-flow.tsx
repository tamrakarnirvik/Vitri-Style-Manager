import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatNPR } from "@/lib/format";
export function CashFlow({received,expenses,pending,purchases,refunds}:{received:number;expenses:number;pending:number;purchases:number;refunds:number}){
 const rows=[{label:"Customer payments collected",v:received},{label:"Operating expenses paid",v:-expenses},{label:"Paid stock purchases",v:-purchases},{label:"Customer refunds",v:-refunds}];
 return <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">Money movement</h2><p className="mt-1 text-xs text-neutral-500">Today's recorded operating money flow · Nepal time</p>
  <div className="mt-6 space-y-4">{rows.map(r=><div key={r.label} className="flex items-center justify-between gap-3"><span className="flex items-center gap-3 text-sm text-neutral-600"><span className="rounded-lg bg-neutral-100 p-2">{r.v<0?<ArrowUpRight size={17}/>:<ArrowDownLeft size={17}/>}</span>{r.label}</span><span className="font-semibold tabular-nums">{r.v<0?"−":""}{formatNPR(Math.abs(r.v))}</span></div>)}</div>
  <div className="my-5 border-t border-dashed border-neutral-200"/><p className="text-xs text-neutral-500">Net operating cash movement today</p><p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatNPR(received-expenses-purchases-refunds)}</p>
  <div className="mt-5 rounded-xl bg-neutral-50 p-4"><p className="text-xs font-medium text-neutral-700">Outstanding customer payments · all time</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatNPR(pending)}</p><p className="mt-2 text-xs leading-5 text-neutral-500">This is not cash on hand. Opening balances, transfers and reconciliation differences are kept separately in <Link className="font-semibold underline" href="/accounts">Accounts</Link>.</p></div>
 </section>;
}
