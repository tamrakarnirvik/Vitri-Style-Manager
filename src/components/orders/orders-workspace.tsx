"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Download, PackageCheck, Search, Truck, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SaleRow, AccountRow } from "@/lib/business-client";
import { formatBusinessDate } from "@/lib/business-client";
import {
  type DeliveryRow,
  type DeliveryEvent,
  type DeliveryStatus,
  deliveryLabels,
  nextDeliveryStatus,
} from "@/lib/order-types";
import { formatNPR } from "@/lib/format";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  Field,
  TextInput,
  SelectInput,
  primaryButton,
  secondaryButton,
  inputClass,
} from "@/components/ui/form-fields";
import { Reveal } from "@/components/ui/reveal";

type Filter = "all" | "not_started" | DeliveryStatus | "cod_due";
const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "other", label: "Other" },
] as const;

function remaining(sale: SaleRow) {
  return Math.max(0, Math.round((sale.grand_total - sale.collected) * 100) / 100);
}
function isReversed(sale: SaleRow) {
  return sale.status === "cancelled" || sale.status === "returned";
}
function safeCsvCell(raw: string | number) {
  let value = String(raw);
  // Prevent spreadsheet formula injection from customer-entered text.
  if (/^[\s]*[=+\-@]/.test(value)) value = "'" + value;
  return '"' + value.replaceAll('"', '""') + '"';
}

export function OrdersWorkspace({
  sales,
  accounts,
  deliveries,
  events,
  costs,
}: {
  sales: SaleRow[];
  accounts: AccountRow[];
  deliveries: DeliveryRow[];
  events: DeliveryEvent[];
  costs: Record<string, number>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editSale, setEditSale] = useState<SaleRow | null>(null);
  const [statusSale, setStatusSale] = useState<SaleRow | null>(null);
  const [paymentSale, setPaymentSale] = useState<SaleRow | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [statusChoice, setStatusChoice] = useState<DeliveryStatus>("pending");
  const [statusNote, setStatusNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAccount, setPaymentAccount] = useState(accounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const deliveryBySale = useMemo(
    () => new Map(deliveries.map((d) => [d.sale_id, d])),
    [deliveries]
  );
  const historyByDelivery = useMemo(() => {
    const map = new Map<string, DeliveryEvent[]>();
    for (const event of events) {
      const list = map.get(event.delivery_id) ?? [];
      list.push(event);
      map.set(event.delivery_id, list);
    }
    return map;
  }, [events]);
  const activeSales = sales.filter((s) => !isReversed(s));
  const setupCount = activeSales.filter((s) => !deliveryBySale.has(s.id)).length;
  const dispatchedCount = activeSales.filter(
    (s) => deliveryBySale.get(s.id)?.status === "dispatched"
  ).length;
  const deliveredCount = activeSales.filter(
    (s) => deliveryBySale.get(s.id)?.status === "delivered"
  ).length;
  const codOutstanding = activeSales.reduce((total, s) => total + remaining(s), 0);

  const filtered = sales.filter((sale) => {
    const delivery = deliveryBySale.get(sale.id);
    const haystack = [
      sale.order_number,
      sale.customer_name,
      delivery?.phone,
      delivery?.courier,
      delivery?.tracking_number,
    ].join(" ").toLowerCase();
    if (search && !haystack.includes(search.trim().toLowerCase())) return false;
    if (filter === "all") return true;
    if (filter === "cod_due") return !isReversed(sale) && remaining(sale) > 0;
    if (filter === "not_started") return !isReversed(sale) && !delivery;
    return !isReversed(sale) && delivery?.status === filter;
  });

  function edit(sale: SaleRow) {
    const d = deliveryBySale.get(sale.id);
    setEditSale(sale);
    setPhone(d?.phone ?? "");
    setAddress(d?.delivery_address ?? "");
    setCourier(d?.courier ?? "");
    setTracking(d?.tracking_number ?? "");
    setExpectedDate(d?.expected_delivery_date ?? "");
    setDeliveryNotes(d?.delivery_notes ?? "");
    setError("");
  }
  function changeStatus(sale: SaleRow) {
    const d = deliveryBySale.get(sale.id);
    if (!d) return;
    setStatusSale(sale);
    setStatusChoice(nextDeliveryStatus[d.status][0] ?? d.status);
    setStatusNote("");
    setError("");
  }
  function collect(sale: SaleRow) {
    setPaymentSale(sale);
    setPaymentAmount(String(remaining(sale)));
    setPaymentMethod("cash");
    setPaymentAccount(accounts[0]?.id ?? "");
    setError("");
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editSale || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const db = createClient();
      const { error: rpcError } = await db.rpc("save_delivery_details_v5", {
        p_sale_id: editSale.id,
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
        p_courier: courier.trim() || null,
        p_tracking_number: tracking.trim() || null,
        p_expected_date: expectedDate || null,
        p_notes: deliveryNotes.trim() || null,
      });
      if (rpcError) throw rpcError;
      setEditSale(null);
      setNotice("Delivery information saved.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save delivery details."); }
    finally { setBusy(false); }
  }

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statusSale || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const db = createClient();
      const { error: rpcError } = await db.rpc("set_delivery_status_v5", {
        p_sale_id: statusSale.id,
        p_new_status: statusChoice,
        p_note: statusNote.trim() || null,
      });
      if (rpcError) throw rpcError;
      setStatusSale(null);
      setNotice("Delivery status updated and recorded in history.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not change delivery status."); }
    finally { setBusy(false); }
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentSale || busy) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 || amount > remaining(paymentSale)) {
      setError("Enter a valid payment up to the outstanding amount (2 decimal places).");
      return;
    }
    if (!paymentAccount) { setError("Choose the account that actually received the money."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const db = createClient();
      const { error: rpcError } = await db.rpc("record_payment_v4", {
        p_sale_id: paymentSale.id,
        p_amount: amount,
        p_method: paymentMethod,
        p_account_id: paymentAccount,
      });
      if (rpcError) throw rpcError;
      setPaymentSale(null);
      setNotice("Payment recorded and added to the chosen account ledger.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record payment."); }
    finally { setBusy(false); }
  }

  function exportCsv() {
    const headers = ["Order", "Customer", "Phone", "Address", "Courier", "Tracking", "Expected date", "Delivery status", "Order status", "Total NPR", "Received NPR", "Outstanding NPR", "Estimated gross margin NPR"];
    const body = filtered.map((sale) => {
      const d = deliveryBySale.get(sale.id);
      return [sale.order_number, sale.customer_name ?? "", d?.phone ?? "", d?.delivery_address ?? "", d?.courier ?? "", d?.tracking_number ?? "", d?.expected_delivery_date ?? "", d ? deliveryLabels[d.status] : "Not set up", sale.status, sale.grand_total, sale.collected, isReversed(sale) ? 0 : remaining(sale), isReversed(sale) || costs[sale.id] === undefined ? "" : sale.grand_total - costs[sale.id]];
    });
    const csv = "\uFEFF" + [headers, ...body].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "vitristyle-orders.csv";
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <Reveal>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Operations & fulfillment</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Orders</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">Manage delivery details, courier progress and actual COD collections for your recent orders.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className={secondaryButton} onClick={exportCsv}><Download size={16}/> Export CSV</button>
        <Link href="/sales" className={primaryButton}>New sale</Link>
      </div>
    </div>

    {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Need delivery setup", value: String(setupCount), icon: ClipboardList },
        { label: "Dispatched", value: String(dispatchedCount), icon: Truck },
        { label: "Delivered", value: String(deliveredCount), icon: PackageCheck },
        { label: "Customer money outstanding", value: formatNPR(codOutstanding), icon: Wallet },
      ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-transform motion-safe:hover:-translate-y-0.5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-neutral-500">{label}</p><Icon size={17} className="text-neutral-500"/></div><p className="mt-3 text-2xl font-bold tabular-nums">{value}</p></div>)}
    </div>

    <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[180px] flex-1 space-y-1.5"><span className="text-xs font-medium text-neutral-600">Find an order</span><span className="relative block"><Search size={16} className="absolute left-3 top-3 text-neutral-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, customer, courier, tracking" className={`${inputClass} pl-9`}/></span></label>
        <label className="space-y-1.5"><span className="text-xs font-medium text-neutral-600">Show</span><SelectInput value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">All recent orders</option><option value="not_started">Not set up</option>
          <option value="pending">Pending</option><option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option><option value="delivered">Delivered</option>
          <option value="failed_delivery">Delivery failed</option><option value="cod_due">Payment outstanding</option>
        </SelectInput></label>
      </div>
      <p className="mt-3 text-xs text-neutral-500">Showing {filtered.length} of the latest {sales.length} orders. Delivery status and payment status are tracked separately. Export includes customer contact details—store it securely.</p>
    </div>

    {filtered.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">No orders match your search. Record your first sale on the Sales page or change the filter.</div> :
      <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
        {filtered.map((sale) => {
          const d = deliveryBySale.get(sale.id);
          const reversed = isReversed(sale);
          const due = reversed ? 0 : remaining(sale);
          const transitions = d ? nextDeliveryStatus[d.status] : [];
          const history = d ? (historyByDelivery.get(d.id) ?? []).slice(0, 3) : [];
          return <section key={sale.id} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow duration-200 hover:shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{sale.order_number}</p><h2 className="mt-1 text-lg font-semibold">{sale.customer_name || "Walk-in / unnamed customer"}</h2><p className="mt-1 text-xs text-neutral-500">{formatBusinessDate(sale.sold_at)}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reversed ? "bg-red-50 text-red-800" : d?.status === "delivered" ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-700"}`}>{reversed ? sale.status : d ? deliveryLabels[d.status] : "Not set up"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-xs sm:grid-cols-4"><div><p className="text-neutral-500">Sale</p><p className="mt-1 font-semibold tabular-nums">{formatNPR(sale.grand_total)}</p></div><div><p className="text-neutral-500">Received</p><p className="mt-1 font-semibold tabular-nums">{formatNPR(sale.collected)}</p></div><div><p className="text-neutral-500">Due</p><p className="mt-1 font-semibold tabular-nums">{formatNPR(due)}</p></div><div><p className="text-neutral-500">Gross margin*</p><p className="mt-1 font-semibold tabular-nums">{reversed || costs[sale.id] === undefined ? "—" : formatNPR(sale.grand_total - costs[sale.id])}</p></div></div>
            {d ? <div className="mt-4 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2"><p><span className="text-neutral-500">Phone: </span>{d.phone || "—"}</p><p><span className="text-neutral-500">Courier: </span>{d.courier || "—"}</p><p className="sm:col-span-2"><span className="text-neutral-500">Address: </span>{d.delivery_address || "—"}</p><p><span className="text-neutral-500">Tracking: </span>{d.tracking_number || "—"}</p><p><span className="text-neutral-500">Expected: </span>{d.expected_delivery_date || "—"}</p></div> : <p className="mt-4 text-sm text-neutral-500">No courier or delivery details yet.</p>}
            {history.length > 0 && <div className="mt-4 border-t border-neutral-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Recent activity</p><div className="mt-2 space-y-1.5">{history.map((event) => <p key={event.id} className="text-xs text-neutral-600">{formatBusinessDate(event.changed_at)} · {event.new_status.replaceAll("_", " ")}{event.note ? ` — ${event.note}` : ""}</p>)}</div></div>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
              <button type="button" disabled={reversed} className={secondaryButton} onClick={() => edit(sale)}>{d ? "Edit delivery" : "Set up delivery"}</button>
              <button type="button" disabled={reversed || transitions.length === 0} className={secondaryButton} onClick={() => changeStatus(sale)}>Change status</button>
              {due > 0 && <button type="button" disabled={!accounts.length} className={primaryButton} onClick={() => collect(sale)}>Collect payment</button>}
            </div>
            {due > 0 && !accounts.length && <p className="mt-2 text-xs text-amber-700">Create a cash, bank or wallet account before recording payments.</p>}
          </section>;
        })}
      </div>}

    <p className="mt-6 text-xs leading-5 text-neutral-500">*Gross margin = sale total less recorded cost of goods sold; it excludes packaging, courier fees, advertising and other expenses. This page covers the most recent 100 sales. Delivery updates do not change revenue, stock or cash. For courier fees, use Expenses; for customer receipts, use Collect payment only when money has actually been received.</p>

    <FormDialog title={editSale ? `Delivery details · ${editSale.order_number}` : "Delivery details"} open={Boolean(editSale)} onClose={() => { if (!busy) { setEditSale(null); setError(""); } }}>
      <form onSubmit={saveDetails} className="space-y-4">
        <Field label="Customer phone"><TextInput value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" autoComplete="tel"/></Field>
        <Field label="Delivery address"><textarea className={inputClass} value={address} maxLength={350} rows={3} onChange={(e) => setAddress(e.target.value)} placeholder="Area, landmark, city"/></Field>
        <Field label="Courier / delivery partner"><TextInput value={courier} maxLength={90} onChange={(e) => setCourier(e.target.value)} placeholder="Courier name or self delivery"/></Field>
        <Field label="Tracking reference"><TextInput value={tracking} maxLength={100} onChange={(e) => setTracking(e.target.value)} placeholder="Optional"/></Field>
        <Field label="Expected delivery date"><TextInput type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}/></Field>
        <Field label="Delivery notes"><textarea className={inputClass} value={deliveryNotes} maxLength={500} rows={2} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Delivery instructions (optional)"/></Field>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={() => setEditSale(null)}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? "Saving…" : "Save details"}</button></div>
      </form>
    </FormDialog>

    <FormDialog title={statusSale ? `Update · ${statusSale.order_number}` : "Update status"} open={Boolean(statusSale)} onClose={() => { if (!busy) { setStatusSale(null); setError(""); } }}>
      <form onSubmit={saveStatus} className="space-y-4">
        <p className="text-sm text-neutral-600">Each status update is kept in the delivery audit trail. Delivered is the final status.</p>
        <Field label="New delivery status"><SelectInput value={statusChoice} onChange={(e) => setStatusChoice(e.target.value as DeliveryStatus)}>{(statusSale ? nextDeliveryStatus[deliveryBySale.get(statusSale.id)?.status ?? "pending"] : []).map((status) => <option key={status} value={status}>{deliveryLabels[status]}</option>)}</SelectInput></Field>
        <Field label="Reason / note (optional)"><TextInput value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={250} placeholder="Courier handed over parcel"/></Field>
        <p className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">Marking an order delivered does not collect COD money. Use “Collect payment” once the money reaches you.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={() => setStatusSale(null)}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? "Updating…" : "Update status"}</button></div>
      </form>
    </FormDialog>

    <FormDialog title={paymentSale ? `Collect · ${paymentSale.order_number}` : "Collect payment"} open={Boolean(paymentSale)} onClose={() => { if (!busy) { setPaymentSale(null); setError(""); } }}>
      <form onSubmit={savePayment} className="space-y-4">
        <p className="rounded-xl bg-neutral-50 p-3 text-sm">Outstanding: <strong>{formatNPR(paymentSale ? remaining(paymentSale) : 0)}</strong></p>
        <Field label="Amount actually received (NPR)"><TextInput type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></Field>
        <Field label="Payment method"><SelectInput value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</SelectInput></Field>
        <Field label="Money received into"><SelectInput required value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}><option value="">Choose account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field>
        <p className="text-xs text-neutral-500">For courier COD settlements, reconcile the gross customer payment and any courier fee separately. Example: Rs. 400 COD less Rs. 20 courier fee = Rs. 380 net deposited. Record Rs. 400 customer payment and Rs. 20 fee in Expenses against the same account only after the settlement is confirmed.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={() => setPaymentSale(null)}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? "Recording…" : "Record payment"}</button></div>
      </form>
    </FormDialog>
  </Reveal>;
}
