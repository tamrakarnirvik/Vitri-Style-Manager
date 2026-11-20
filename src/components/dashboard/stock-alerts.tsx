import Link from "next/link";
import { ArrowUpRight, PackageCheck } from "lucide-react";
import type { Product } from "@/lib/business";

export function StockAlerts({ products }: { products: Product[] }) {
  const low = products.filter((p) => p.is_active && p.stock_quantity <= 5).sort((a,b) => a.stock_quantity - b.stock_quantity).slice(0, 5);
  return (
    <section className="vs-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-bold text-[#26364c]">Stock alerts</h2><p className="mt-1 text-xs text-[#8390a2]">Active products with 5 units or less</p></div><Link href="/inventory" className="text-[#3064bb]" aria-label="View inventory"><ArrowUpRight size={17}/></Link></div>
      {low.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5faf8] px-4 py-4"><PackageCheck size={20} className="text-[#26946c]"/><p className="text-xs font-medium text-[#548574]">No low-stock products found in the loaded inventory.</p></div>
      ) : (
        <div className="mt-4 space-y-2">
          {low.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eef1f6] px-3.5 py-3"><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-[#32435d]">{product.name}</p><p className="mt-0.5 text-[11px] text-[#94a0b2]">{product.sku}</p></div><span className="whitespace-nowrap rounded-lg bg-[#fff4e3] px-2 py-1 text-[11px] font-bold text-[#ae7622]">{product.stock_quantity} left</span></div>)}
        </div>
      )}
    </section>
  );
}
