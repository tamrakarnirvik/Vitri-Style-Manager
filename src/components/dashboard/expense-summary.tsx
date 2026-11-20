import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategoryTotal } from "@/lib/business";
import { formatNPR } from "@/lib/format";

export function ExpenseSummary({ categories }: { categories: CategoryTotal[] }) {
  const total = categories.reduce((sum, category) => sum + category.amount, 0);
  return (
    <section className="vs-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-bold text-[#26364c]">Expense breakdown</h2><p className="mt-1 text-xs text-[#8390a2]">Today · operating expenses only</p></div><Link href="/expenses" className="text-[#3064bb]" aria-label="View expenses"><ArrowUpRight size={17}/></Link></div>
      {categories.length === 0 ? <p className="mt-6 rounded-xl bg-[#f8faff] px-4 py-6 text-xs leading-5 text-[#8390a2]">No operating expenses recorded today.</p> : (
        <div className="mt-6 space-y-5">
          {categories.map((category) => {
            const percent = total > 0 ? Math.min(100, category.amount / total * 100) : 0;
            return <div key={category.category}>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="font-medium text-[#64758d]">{category.category}</span><span className="font-semibold text-[#2e425f] tabular-nums">{formatNPR(category.amount)}</span></div>
              <div role="progressbar" aria-label={`${category.category} share of expenses`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-[6px] overflow-hidden rounded-full bg-[#edf1f7]"><div className="h-full rounded-full bg-[#5686eb] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }}/></div>
            </div>;
          })}
        </div>
      )}
    </section>
  );
}
