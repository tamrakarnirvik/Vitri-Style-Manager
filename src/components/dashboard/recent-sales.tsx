import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { SaleRow } from "@/lib/business";
import { formatNPR } from "@/lib/format";

export function RecentSales({ sales }: { sales: SaleRow[] }) {
  const recent = sales.slice(0, 6);
  return (
    <section className="vs-card min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-[#26364c]">Recent sales</h2>
          <p className="mt-1 text-xs text-[#8390a2]">Your latest recorded orders</p>
        </div>
        <Link href="/sales" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-[#3064bb] hover:text-[#1e4f9f]">
          View all <ArrowUpRight size={16} />
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="mx-4 mb-5 flex min-h-[170px] flex-col items-center justify-center rounded-xl border border-dashed border-[#e4eaf4] bg-[#fbfcff] px-5 text-center sm:mx-6">
          <ShoppingBag size={26} className="text-[#9eacc4]" />
          <p className="mt-3 text-sm font-semibold text-[#394962]">No sales yet</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[#8391a4]">Create a product, then record your first sale.</p>
        </div>
      ) : (
        <>
          {/* Phone-sized sale cards: no horizontal scrolling. */}
          <div className="divide-y divide-[#edf0f5] border-t border-[#edf0f5] md:hidden">
            {recent.map((sale) => {
              const reversed = sale.status === "returned" || sale.status === "cancelled";
              const due = reversed ? 0 : Math.max(0, sale.grand_total - sale.collected);
              return (
                <div key={sale.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-[#314765]">{sale.order_number}</p>
                      <p className="mt-1 truncate text-xs text-[#64748b]">{sale.customer_name || "Walk-in / online"}</p>
                    </div>
                    <p className="shrink-0 text-base font-bold text-[#2c3e55] tabular-nums">{formatNPR(sale.grand_total)}</p>
                  </div>
                  <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${reversed ? "bg-[#f1f3f7] text-[#78859a]" : due > 0 ? "bg-[#fff6e8] text-[#ad741a]" : "bg-[#eaf9f3] text-[#23805f]"}`}>
                    {reversed ? sale.status : due > 0 ? `${formatNPR(due)} outstanding` : "Paid"}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Desktop retains the detailed table. */}
          <div className="hidden overflow-x-auto border-t border-[#edf0f5] md:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="vs-table-head"><tr><th className="px-6 py-3.5">Order ID</th><th className="px-4 py-3.5">Customer</th><th className="px-4 py-3.5">Total</th><th className="px-6 py-3.5">Collection</th></tr></thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {recent.map((sale) => {
                  const reversed = sale.status === "returned" || sale.status === "cancelled";
                  const due = reversed ? 0 : Math.max(0, sale.grand_total - sale.collected);
                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-[#fafcff]">
                      <td className="px-6 py-3.5 font-semibold text-[#314765]">{sale.order_number}</td>
                      <td className="px-4 py-3.5 text-[#64748b]">{sale.customer_name || "Walk-in / online"}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#2c3e55] tabular-nums">{formatNPR(sale.grand_total)}</td>
                      <td className="px-6 py-3.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${reversed ? "bg-[#f1f3f7] text-[#78859a]" : due > 0 ? "bg-[#fff6e8] text-[#ad741a]" : "bg-[#eaf9f3] text-[#23805f]"}`}>{reversed ? sale.status : due > 0 ? `${formatNPR(due)} due` : "Paid"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
