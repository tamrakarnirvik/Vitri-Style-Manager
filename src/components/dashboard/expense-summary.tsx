import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategoryTotal } from "@/lib/business";
import { formatNPR } from "@/lib/format";

export function ExpenseSummary({ categories }: { categories: CategoryTotal[] }) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0);
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-2"><div><h2 className="text-base font-semibold">Today's expenses</h2><p className="mt-1 text-xs text-neutral-500">Operating costs by category</p></div><Link href="/expenses" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900">Details <ArrowUpRight size={15} /></Link></div>
    {categories.length === 0 ? <p className="mt-7 text-sm text-neutral-500">No operating expenses entered today.</p> : <div className="mt-6 space-y-5">{categories.map((c) => <div key={c.category}>
      <div className="mb-2 flex justify-between text-xs"><span className="font-medium text-neutral-700">{c.category}</span><span className="font-semibold tabular-nums">{formatNPR(c.amount)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-800 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${total > 0 ? (c.amount / total) * 100 : 0}%` }} /></div>
    </div>)}</div>}
  </section>;
}
