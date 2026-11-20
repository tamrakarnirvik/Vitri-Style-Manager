import Link from "next/link";
import type { Product } from "@/lib/business";

export function StockAlerts({ products }: { products: Product[] }) {
  const low = products.filter((p) => p.stock_quantity <= 5).slice(0,5);
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Low-stock alerts</h2><Link href="/inventory" className="text-xs font-semibold text-neutral-600 hover:text-neutral-900">Inventory</Link></div>
    {low.length === 0 ? <p className="mt-5 text-sm text-neutral-500">No products at or below 5 units.</p> : <div className="mt-5 space-y-3">{low.map((p) => <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-3 py-3"><div><p className="text-sm font-medium">{p.name}</p><p className="mt-1 text-xs text-neutral-500">{p.sku}</p></div><span className="whitespace-nowrap rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">{p.stock_quantity} left</span></div>)}</div>}
  </section>;
}
