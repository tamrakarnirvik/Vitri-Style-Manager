"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBag, Trash2, Wallet, Undo2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBusinessDate, type Product, type SaleRow, type AccountRow } from "@/lib/business-client";
import { formatNPR } from "@/lib/format";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, TextInput, SelectInput, primaryButton, secondaryButton } from "@/components/ui/form-fields";
import { Reveal } from "@/components/ui/reveal";

const methods = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "other", label: "Other" },
];

type Line = { id: number; productId: string; quantity: string };
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function SalesWorkspace({ products, sales, accounts }: { products: Product[]; sales: SaleRow[]; accounts: AccountRow[] }) {
  const router = useRouter();
  const nextId = useRef(1);
  const [saleOpen, setSaleOpen] = useState(false);
  const [paySale, setPaySale] = useState<SaleRow | null>(null);
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ id: 0, productId: "", quantity: "1" }]);
  const [discount, setDiscount] = useState("0");
  const [paymentChoice, setPaymentChoice] = useState<"unpaid" | "paid" | "partial">("unpaid");
  const [method, setMethod] = useState("cash");
  const [partial, setPartial] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("cash");
  const [payAccount, setPayAccount] = useState(accounts[0]?.id ?? "");
  const [collectAccount, setCollectAccount] = useState(accounts[0]?.id ?? "");
  const [reverseSale, setReverseSale] = useState<SaleRow | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [refundAccount, setRefundAccount] = useState(accounts[0]?.id ?? "");
  const [restock, setRestock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const available = products.filter((p) => p.is_active && p.stock_quantity > 0);
  const chosen = lines.map((line) => ({
    line,
    product: products.find((p) => p.id === line.productId),
  }));
  const gross = money(chosen.reduce((sum, r) => sum + (r.product?.selling_price ?? 0) * (Number(r.line.quantity) || 0), 0));
  const grand = money(Math.max(0, gross - (Number(discount) || 0)));
  const amountToCollect = paymentChoice === "paid" ? grand : paymentChoice === "partial" ? Number(partial) : 0;
  const outstanding = (s: SaleRow) => money(Math.max(0, s.grand_total - s.collected));

  function resetSale() {
    setCustomer(""); setNotes(""); setLines([{ id: 0, productId: "", quantity: "1" }]);
    nextId.current = 1;
    setDiscount("0"); setPaymentChoice("unpaid"); setMethod("cash"); setPartial("");
    setError("");
  }

  async function saveSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setNotice("");
    const ids = lines.map((l) => l.productId);
    if (!ids.length || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
      setError("Select a different product for each row."); return;
    }
    if (chosen.some(({ line, product }) => !product || !Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0 || Number(line.quantity) > product.stock_quantity)) {
      setError("Check your product quantities against available stock."); return;
    }
    const discountNum = Number(discount);
    if (!Number.isFinite(discountNum) || discountNum < 0 || money(discountNum) !== discountNum || discountNum > gross) {
      setError("Discount must be between Rs. 0 and the gross sale amount."); return;
    }
    if (!Number.isFinite(amountToCollect) || amountToCollect < 0 || money(amountToCollect) !== amountToCollect || amountToCollect > grand
      || (paymentChoice === "partial" && (amountToCollect <= 0 || amountToCollect >= grand))) {
      setError("Check the amount received. It cannot exceed the sale total."); return;
    }
    if (grand <= 0) { setError("The final sale total must be greater than zero."); return; }
    if (amountToCollect > 0 && !payAccount) { setError("Create and select a payment account first."); return; }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("create_sale_v4", {
        p_customer_name: customer.trim() || null,
        p_items: lines.map((l) => ({ product_id: l.productId, quantity: Number(l.quantity) })),
        p_discount: discountNum,
        p_payment_method: paymentChoice === "unpaid" ? "cod" : method,
        p_paid_amount: money(amountToCollect),
        p_account_id: amountToCollect > 0 ? payAccount : null,
        p_notes: notes.trim() || null,
      });
      if (rpcError) throw rpcError;
      setSaleOpen(false);
      resetSale();
      setNotice("Sale saved. Stock and payments have been updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save sale.");
    } finally {
      setBusy(false);
    }
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paySale || busy) return;
    const amount = Number(collectAmount);
    if (!collectAccount) { setError("Choose a payment account before collecting money."); return; }
    if (!Number.isFinite(amount) || amount <= 0 || money(amount) !== amount || amount > outstanding(paySale)) {
      setError("Enter an amount no greater than the remaining balance."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("record_payment_v4", {
        p_sale_id: paySale.id, p_amount: amount, p_method: collectMethod, p_account_id: collectAccount,
      });
      if (rpcError) throw rpcError;
      setPaySale(null);
      setCollectAmount("");
      setNotice("Payment recorded in the selected account.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
    } finally { setBusy(false); }
  }

  async function saveReversal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!reverseSale || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const paid = reverseSale.collected > 0;
      if (reverseReason.trim().length < 5) throw new Error("Please explain why this order is being reversed.");
      if (paid && !refundAccount) throw new Error("Choose the account that will pay the customer refund.");
      const db = createClient();
      const { error: x } = await db.rpc("reverse_sale_v4", {
        p_sale_id: reverseSale.id,
        p_kind: paid ? "returned" : "cancelled",
        p_restock: paid ? restock : true,
        p_refund_account_id: paid ? refundAccount : null,
        p_reason: reverseReason.trim(),
      });
      if (x) throw x;
      setNotice(paid ? "Return recorded and all collected payments refunded." : "Unpaid order cancelled and stock restored.");
      setReverseSale(null);setReverseReason("");setRestock(false);router.refresh();
    } catch (e) {setError(e instanceof Error ? e.message : "Could not reverse the sale.");}
    finally {setBusy(false);}
  }

  return <Reveal>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Orders & payments</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sales</h1>
        <p className="mt-2 text-sm text-neutral-500">Create sales, track COD and collect outstanding customer payments.</p>
      </div>
      <button type="button" className={primaryButton} onClick={() => { setError(""); setSaleOpen(true); }} disabled={!available.length}><Plus size={17} /> New sale</button>
    </div>
    {!accounts.length && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Create a <a href="/accounts" className="font-semibold underline">payment account</a> for paid sales and COD collections. Unpaid orders are still allowed.</div>}
    {!available.length && <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">Add a product with available stock in <a className="font-semibold underline" href="/inventory">Inventory</a> before recording a sale.</div>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[
        { label: "Recent orders", value: String(sales.length) },
        { label: "Sales value shown", value: formatNPR(sales.filter(s=>!(["cancelled","returned"].includes(s.status))).reduce((sum, s) => sum + s.grand_total, 0)) },
        { label: "Uncollected value shown", value: formatNPR(sales.filter(s=>!(["cancelled","returned"].includes(s.status))).reduce((sum, s) => sum + outstanding(s), 0)) },
      ].map((s) => <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-transform motion-safe:hover:-translate-y-0.5"><p className="text-xs text-neutral-500">{s.label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p></div>)}
    </div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-5 py-4 sm:px-6"><h2 className="font-semibold">Recent sales</h2><p className="mt-1 text-xs text-neutral-500">Newest 100 sales · amounts in NPR</p></div>
      {sales.length === 0 ? <div className="px-6 py-16 text-center"><ShoppingBag className="mx-auto text-neutral-400" size={32} /><p className="mt-3 font-medium">No sales yet</p><p className="mt-1 text-sm text-neutral-500">Create a sale after adding your products.</p></div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500"><tr>
        <th className="px-6 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Sale / Date</th><th className="px-4 py-3 font-medium">Received</th><th className="px-4 py-3 font-medium">Balance</th><th className="px-6 py-3 font-medium">Action</th>
      </tr></thead><tbody className="divide-y divide-neutral-100">{sales.map((s) => <tr key={s.id} className="transition-colors hover:bg-neutral-50/80">
        <td className="px-6 py-4"><span className="font-semibold">{s.order_number}</span><span className="mt-1 block text-xs text-neutral-500">{s.status}</span></td>
        <td className="px-4 py-4">{s.customer_name ?? "Walk-in / online"}</td>
        <td className="px-4 py-4"><span className="font-semibold tabular-nums">{formatNPR(s.grand_total)}</span><span className="mt-1 block text-xs text-neutral-500">{formatBusinessDate(s.sold_at)}</span></td>
        <td className="px-4 py-4 tabular-nums">{formatNPR(s.collected)}</td>
        <td className="px-4 py-4 tabular-nums"><span className={outstanding(s) > 0 ? "font-semibold text-amber-700" : "font-medium text-emerald-700"}>{["cancelled","returned"].includes(s.status)?"Closed":outstanding(s) > 0 ? formatNPR(outstanding(s)) : "Paid"}</span></td>
        <td className="px-6 py-4"><div className="flex flex-wrap gap-2">{!["cancelled","returned"].includes(s.status) && <>
          {outstanding(s)>0 && <button type="button" className={secondaryButton} onClick={() => {setPaySale(s);setCollectAmount(String(outstanding(s)));setError("");}}><Wallet size={15}/> Collect</button>}
          <button type="button" className={secondaryButton} onClick={() => {setReverseSale(s);setReverseReason("");setRestock(false);setError("");}}>{s.collected>0?<Undo2 size={15}/>:<XCircle size={15}/>} {s.collected>0?"Return":"Cancel"}</button>
        </>}{["cancelled","returned"].includes(s.status)&&<span className="text-xs text-neutral-500">Closed</span>}</div></td>
      </tr>)}</tbody></table></div>}
    </div>

    <FormDialog title="Record a new sale" open={saleOpen} onClose={() => { if (!busy) { setSaleOpen(false); setError(""); } }}>
      <form onSubmit={saveSale} className="space-y-4">
        <Field label="Customer name (optional)"><TextInput autoFocus className="mt-1" maxLength={120} placeholder="Customer name" value={customer} onChange={(e)=>setCustomer(e.target.value)} /></Field>
        <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Products</p><button type="button" className="text-xs font-semibold underline disabled:opacity-40" disabled={lines.length >= 20} onClick={() => setLines((prev)=>[...prev,{ id: nextId.current++, productId: "", quantity: "1" }])}>+ Add row</button></div>
          {lines.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            return <div key={line.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex gap-2"><SelectInput required aria-label="Product" value={line.productId} onChange={(e)=>setLines((ls)=>ls.map((x)=>x.id===line.id ? {...x,productId:e.target.value} : x))}>
                <option value="">Select product</option>{available.map((p)=><option value={p.id} key={p.id}>{p.name} · {p.sku} ({p.stock_quantity} left)</option>)}
              </SelectInput>
              {lines.length > 1 && <button aria-label="Remove product row" title="Remove row" type="button" className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-500 hover:text-red-700" onClick={()=>setLines((ls)=>ls.filter((x)=>x.id!==line.id))}><Trash2 size={17} /></button>}</div>
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-neutral-500">{product ? `${formatNPR(product.selling_price)} each · ${product.stock_quantity} in stock` : "Choose a product"}</span><div className="flex items-center gap-2"><span className="text-xs text-neutral-500">Qty</span><TextInput type="number" required min="1" max={product?.stock_quantity ?? 10000} step="1" aria-label="Quantity" className="!w-20" value={line.quantity} onChange={(e)=>setLines((ls)=>ls.map((x)=>x.id===line.id ? {...x, quantity:e.target.value}:x))} /></div></div>
            </div>;
          })}
        </div>
        <div className="rounded-xl bg-neutral-50 p-4 text-sm"><div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>{formatNPR(gross)}</span></div>
          <div className="mt-3 flex items-center justify-between gap-3"><label htmlFor="sale-discount" className="text-neutral-600">Discount (Rs.)</label><TextInput id="sale-discount" className="!w-32" type="number" min="0" step="0.01" value={discount} onChange={(e)=>setDiscount(e.target.value)} /></div>
          <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 font-semibold"><span>Sale total</span><span className="tabular-nums">{formatNPR(grand)}</span></div></div>
        <Field label="Payment received"><SelectInput className="mt-1" value={paymentChoice} onChange={(e)=>setPaymentChoice(e.target.value as "unpaid" | "paid" | "partial")}>
          <option value="unpaid">Unpaid / COD — collect later</option><option value="paid">Fully paid now</option><option value="partial">Partially paid now</option>
        </SelectInput></Field>
        {paymentChoice !== "unpaid" && <Field label="Payment method"><SelectInput className="mt-1" value={method} onChange={(e)=>setMethod(e.target.value)}>{methods.map((m)=><option value={m.value} key={m.value}>{m.label}</option>)}</SelectInput></Field>}
        {paymentChoice!=="unpaid" && <Field label="Money received into"><SelectInput required value={payAccount} onChange={e=>setPayAccount(e.target.value)}><option value="">Choose account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field>}
        {paymentChoice === "partial" && <Field label="Amount received now (Rs.)"><TextInput type="number" min="0.01" step="0.01" required className="mt-1" value={partial} onChange={(e)=>setPartial(e.target.value)} /></Field>}
        <Field label="Notes (optional)"><TextInput className="mt-1" maxLength={500} value={notes} placeholder="Order reference or delivery note" onChange={(e)=>setNotes(e.target.value)} /></Field>
        <div className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-600">Received now: <strong>{formatNPR(money(Number(amountToCollect) || 0))}</strong> · Pending: <strong>{formatNPR(money(Math.max(0, grand - (Number(amountToCollect) || 0))))}</strong></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={secondaryButton} disabled={busy} onClick={()=>setSaleOpen(false)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy?"Saving…":"Save sale"}</button></div>
      </form>
    </FormDialog>

    <FormDialog title={paySale ? `Collect payment · ${paySale.order_number}` : "Collect payment"} open={Boolean(paySale)} onClose={() => { if (!busy) { setPaySale(null); setError(""); } }}>
      <form onSubmit={savePayment} className="space-y-4">
        <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">Outstanding balance: <strong className="text-neutral-900">{formatNPR(paySale ? outstanding(paySale) : 0)}</strong></p>
        <Field label="Amount collected (Rs.)"><TextInput autoFocus type="number" required min="0.01" step="0.01" max={paySale ? outstanding(paySale) : 0} className="mt-1" value={collectAmount} onChange={(e)=>setCollectAmount(e.target.value)} /></Field>
        <Field label="Payment method"><SelectInput className="mt-1" value={collectMethod} onChange={(e)=>setCollectMethod(e.target.value)}>{methods.map((m)=><option value={m.value} key={m.value}>{m.label}</option>)}</SelectInput></Field>
        <Field label="Money received into"><SelectInput required value={collectAccount} onChange={e=>setCollectAccount(e.target.value)}><option value="">Choose account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={secondaryButton} disabled={busy} onClick={()=>setPaySale(null)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy?"Saving…":"Record payment"}</button></div>
      </form>
    </FormDialog>

    <FormDialog title={reverseSale?.collected ? "Full return and refund" : "Cancel unpaid order"} open={Boolean(reverseSale)} onClose={()=>{if(!busy){setReverseSale(null);setError("");}}}>
      <form onSubmit={saveReversal} className="space-y-4">
        <p className="rounded-xl bg-neutral-50 p-4 text-sm">Order <strong>{reverseSale?.order_number}</strong> · {reverseSale?.collected?`Refund ${formatNPR(reverseSale.collected)} to customer` : "No customer payment collected"}</p>
        {Boolean(reverseSale?.collected) && <>
          <Field label="Refund money from"><SelectInput required value={refundAccount} onChange={e=>setRefundAccount(e.target.value)}><option value="">Choose account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field>
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><input type="checkbox" className="mt-1" checked={restock} onChange={e=>setRestock(e.target.checked)}/><span><strong>Return items to sellable stock</strong><span className="mt-1 block text-xs leading-5">Leave unchecked for worn, opened or hygiene-sensitive undergarments. Non-restocked items are marked as stock write-offs.</span></span></label>
        </>}
        {!reverseSale?.collected && <p className="text-sm text-neutral-500">Unpaid cancellations automatically restore the sold stock.</p>}
        <Field label="Reason"><TextInput autoFocus required minLength={5} maxLength={250} placeholder="Customer cancelled order / full return" value={reverseReason} onChange={e=>setReverseReason(e.target.value)}/></Field>
        <p className="text-xs leading-5 text-neutral-500">Only full-order reversals are supported. This permanently closes the order; do not create a second refund for it.</p>
        {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={()=>setReverseSale(null)}>Keep order</button><button type="submit" disabled={busy} className={primaryButton}>{busy?"Saving…":reverseSale?.collected?"Confirm refund":"Confirm cancellation"}</button></div>
      </form>
    </FormDialog>
  </Reveal>;
}
