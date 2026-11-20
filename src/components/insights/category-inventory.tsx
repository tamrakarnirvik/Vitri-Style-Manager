import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import type { Product } from "@/lib/business";

export function CategoryInventory({ products }: { products: Product[] }) {
  const categories = new Map<string, { skus: number; units: number }>();
  for (const product of products) {
    if (!product.is_active) continue;
    const name = product.category?.trim() || "Other";
    const previous = categories.get(name) ?? { skus: 0, units: 0 };
    categories.set(name, { skus: previous.skus + 1, units: previous.units + product.stock_quantity });
  }
  const rows = [...categories.entries()].map(([name, data]) => ({ name, ...data })).sort((a,b) => b.units - a.units).slice(0, 6);
  const max = Math.max(1, ...rows.map((row) => row.units));
  return (
    <section className="vs-card h-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-bold text-[#26364c]">Inventory by category</h2><p className="mt-1 text-xs text-[#8390a2]">Available units in active products</p></div><Link href="/inventory" className="text-[#3064bb]" aria-label="View inventory"><ArrowUpRight size={17}/></Link></div>
      {rows.length === 0 ? <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#f7f9fc] p-5"><Package size={19} className="text-[#94a2b4]"/><p className="text-xs text-[#7e8da1]">Add products to display your category mix.</p></div> : (
        <div className="mt-6 space-y-[19px]">
          {rows.map((row) => (
            <div key={row.name}>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="font-medium text-[#516580]">{row.name} <span className="ml-1 text-[11px] font-normal text-[#a0abba]">{row.skus} SKUs</span></span><span className="font-semibold text-[#2b4364] tabular-nums">{row.units} units</span></div>
              <div className="h-[6px] overflow-hidden rounded-full bg-[#edf1f7]"><div className="h-full rounded-full bg-[#5686eb]" style={{width: `${row.units / max * 100}%`}}/></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
