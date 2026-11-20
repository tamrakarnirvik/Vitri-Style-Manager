"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBusinessDate, type ExpenseRow, type AccountRow } from "@/lib/business-client";
import { formatNPR } from "@/lib/format";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, TextInput, SelectInput, primaryButton, secondaryButton } from "@/components/ui/form-fields";
import { Reveal } from "@/components/ui/reveal";

const categories = ["Packaging", "Delivery", "Advertising", "Transportation", "Rent", "Utilities", "Other"];

export function ExpensesWorkspace({ expenses, accounts }: { expenses: ExpenseRow[]; accounts: AccountRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState(accounts[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const visible = expenses.filter((e) => filter === "All" || e.category === filter);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 9999999999 || Math.round(value * 100) / 100 !== value) {
      setError("Enter a valid positive amount (maximum two decimal places).");
      return;
    }
    if (!account) { setError("Create a payment account first on the Accounts page."); return; }
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.rpc("create_expense_v4", {
        p_category: category,
        p_description: description.trim() || null,
        p_amount: value,
        p_account_id: account,
      });
      if (insertError) throw insertError;
      setOpen(false);
      setAmount("");
      setDescription("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  }

  return <Reveal>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Operating costs</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="mt-2 text-sm text-neutral-500">Record money paid for packaging, delivery and running the business.</p>
      </div>
      <button type="button" onClick={() => setOpen(true)} disabled={!accounts.length} className={primaryButton}><Plus size={17} /> Add expense</button>
    </div>
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 text-xs leading-5 text-neutral-600">
      <strong className="text-neutral-900">Tip:</strong> Stock purchases are recorded under <a href="/inventory" className="font-semibold underline">Inventory</a>, not here. Each operating expense now reduces the selected account balance.
    </div>
    {!accounts.length && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Create a <a href="/accounts" className="underline font-semibold">payment account</a> before adding expenses.</p>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <div>
        <p className="text-xs text-neutral-500">Recent expenses displayed</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatNPR(visible.reduce((n,e)=>n+e.amount,0))}</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-600">Filter
        <select value={filter} onChange={(e)=>setFilter(e.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 outline-none focus:border-neutral-700">
          <option>All</option>{categories.map((c)=><option key={c}>{c}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-5 py-4 sm:px-6"><h2 className="font-semibold">Recent expenses</h2><p className="mt-1 text-xs text-neutral-500">Showing up to 100 newest entries</p></div>
      {visible.length === 0 ? <div className="px-6 py-16 text-center"><ReceiptText className="mx-auto text-neutral-400" size={32} /><p className="mt-3 font-medium">No expenses yet</p><p className="mt-1 text-sm text-neutral-500">Add an expense when your business pays a running cost.</p></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[610px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-6 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Description</th><th className="px-4 py-3 font-medium">Date (Nepal)</th><th className="px-6 py-3 text-right font-medium">Amount</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">{visible.map((e)=><tr key={e.id} className="transition-colors hover:bg-neutral-50/80">
            <td className="px-6 py-4 font-medium">{e.category}</td><td className="px-4 py-4 text-neutral-600">{e.description ?? "—"}</td><td className="px-4 py-4 text-neutral-500">{formatBusinessDate(e.paid_at)}</td><td className="px-6 py-4 text-right font-semibold tabular-nums">{formatNPR(e.amount)}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
    <FormDialog title="Record an expense" open={open} onClose={() => { if (!busy) { setOpen(false); setError(""); } }}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Expense category"><SelectInput autoFocus className="mt-1" value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map((c)=><option key={c}>{c}</option>)}</SelectInput></Field>
        <Field label="Amount paid (Rs.)"><TextInput className="mt-1" required min="0.01" step="0.01" type="number" placeholder="250" value={amount} onChange={(e)=>setAmount(e.target.value)} /></Field>
        <Field label="Paid from account"><SelectInput required className="mt-1" value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Choose account</option>{accounts.map(a => <option value={a.id} key={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field>
        <Field label="Description (optional)"><TextInput className="mt-1" maxLength={250} placeholder="Packaging for today's orders" value={description} onChange={(e)=>setDescription(e.target.value)} /></Field>
        <p className="text-xs text-neutral-500">The expense is dated when saved and reduces the selected account immediately.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={secondaryButton} disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy?"Saving…":"Save expense"}</button></div>
      </form>
    </FormDialog>
  </Reveal>;
}
