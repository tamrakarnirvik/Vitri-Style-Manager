"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Landmark, Plus, Scale, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBusinessDate, type AccountRow, type AccountEntry } from "@/lib/business-client";
import { formatNPR } from "@/lib/format";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, TextInput, SelectInput, primaryButton, secondaryButton } from "@/components/ui/form-fields";
import { Reveal } from "@/components/ui/reveal";

type Dialog = "new" | "transfer" | "reconcile" | null;
const cents = (v:number) => Number.isFinite(v) && Math.round(v*100) / 100 === v;
export function AccountsWorkspace({ accounts, entries, legacy }: {
 accounts: AccountRow[]; entries: AccountEntry[]; legacy: { payments:number; expenses:number };
}) {
 const router=useRouter();
 const [dialog,setDialog]=useState<Dialog>(null);
 const [name,setName]=useState(""); const [kind,setKind]=useState("cash"); const [opening,setOpening]=useState("0");
 const [from,setFrom]=useState(accounts[0]?.id??""); const [to,setTo]=useState(accounts[1]?.id??""); const [amount,setAmount]=useState("");
 const [reconAccount,setReconAccount]=useState(accounts[0]?.id??""); const [counted,setCounted]=useState(""); const [reason,setReason]=useState("");
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
 const total=accounts.reduce((n,a)=>n+a.balance,0);
 const open=(d:Dialog)=>{setError("");if(d==="transfer"){setFrom(accounts[0]?.id??"");setTo(accounts[1]?.id??"");}setDialog(d);};
 async function save(e:FormEvent<HTMLFormElement>) {
  e.preventDefault(); if (busy) return; setError(""); setNotice("");
  setBusy(true);
  try {
   const db=createClient();
   if (dialog==="new") {
    const val=Number(opening);
    if (!name.trim()||name.trim().length>100||!cents(val)||val<0) throw new Error("Enter an account name and a non-negative opening balance.");
    const {error:x}=await db.from("accounts").insert({name:name.trim(),kind,opening_balance:val});
    if(x) throw x; setName("");setOpening("0");
    setNotice("Account created. Opening balance is saved as the starting position.");
   } else if(dialog==="transfer") {
    const val=Number(amount);if(!from||!to||from===to||!cents(val)||val<=0) throw new Error("Select different accounts and a positive amount.");
    const {error:x}=await db.rpc("transfer_funds_v4",{p_from:from,p_to:to,p_amount:val,p_notes:reason.trim()||null});
    if(x) throw x;setAmount("");setReason("");setNotice("Transfer saved in both account histories.");
   } else if(dialog==="reconcile") {
    const val=Number(counted);if(!reconAccount||!cents(val)||val<0||reason.trim().length<5) throw new Error("Enter a non-negative counted balance and a reason of at least 5 characters.");
    const {error:x}=await db.rpc("reconcile_account_v4",{p_account_id:reconAccount,p_counted_balance:val,p_reason:reason.trim()});
    if(x) throw x;setCounted("");setReason("");setNotice("Balance reconciled with an audit entry.");
   }
   setDialog(null);router.refresh();
  } catch(e) {setError(e instanceof Error?e.message:"Could not save account change.");}finally{setBusy(false);}
 }
 const label=(id:string)=>accounts.find(a=>a.id===id)?.name??"Account";
 return <Reveal>
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Cashbook and balances</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Accounts</h1><p className="mt-2 text-sm text-neutral-500">Track money held in cash, banks, eSewa and Khalti wallets.</p></div>
  <div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={()=>open("transfer")} disabled={accounts.length<2}><ArrowLeftRight size={16}/> Transfer</button><button className={primaryButton} onClick={()=>open("new")}><Plus size={16}/> Add account</button></div></div>
  {notice&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  {(legacy.payments>0||legacy.expenses>0)&&<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Earlier Phase 3 records need attention:</strong> {legacy.payments} payment(s) and {legacy.expenses} expense(s) have no account assigned. They appear in your sales/expense history but are <strong>not included in account balances</strong>. Reconcile your opening balance using your bank statements and cash count; do not duplicate these transactions.</div>}
  <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-900 p-6 text-white"><p className="text-xs text-neutral-300">Total recorded balance across accounts</p><p className="mt-2 text-3xl font-bold tabular-nums sm:text-4xl">{formatNPR(total)}</p><p className="mt-3 text-xs leading-5 text-neutral-300">Opening balances + tracked transactions + reconciliation entries. Not necessarily the same as bank-confirmed cash.</p></div>
  <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Payment accounts">{accounts.map(a=><div key={a.id} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-transform motion-safe:hover:-translate-y-0.5"><div className="flex items-center justify-between"><p className="font-semibold">{a.name}</p>{a.kind==="bank"?<Landmark size={18} className="text-neutral-400"/>:<Wallet size={18} className="text-neutral-400"/>}</div><p className="mt-1 text-xs capitalize text-neutral-500">{a.kind}</p><p className="mt-4 text-2xl font-bold tabular-nums">{formatNPR(a.balance)}</p><p className="mt-2 text-xs text-neutral-500">Opening: {formatNPR(a.opening_balance)}</p><button type="button" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold underline underline-offset-4" onClick={()=>{setReconAccount(a.id);setCounted(String(a.balance));open("reconcile");}}><Scale size={14}/> Reconcile balance</button></div>)}
  {!accounts.length&&<div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">Create your first payment account (for example, Cash). Other Phase 4 forms will use it to record real money movement.</div>}</section>
  <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 p-5"><h2 className="font-semibold">Recent account movements</h2><p className="mt-1 text-xs text-neutral-500">Latest 100 ledger entries · transfers and balance adjustments are identified separately</p></div>
  {!entries.length?<p className="p-8 text-center text-sm text-neutral-500">No account movements yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Account</th><th className="px-4 py-3 font-medium">Type / Note</th><th className="px-5 py-3 text-right font-medium">Change</th></tr></thead><tbody className="divide-y divide-neutral-100">{entries.map(e=><tr key={e.id}><td className="px-5 py-4 text-neutral-500">{formatBusinessDate(e.occurred_at)}</td><td className="px-4 py-4">{label(e.account_id)}</td><td className="px-4 py-4"><span className="font-medium capitalize">{e.kind.replaceAll("_"," ")}</span><span className="mt-1 block max-w-xs truncate text-xs text-neutral-500" title={e.note??""}>{e.note??"—"}</span></td><td className={`px-5 py-4 text-right font-semibold tabular-nums ${e.amount<0?"text-neutral-800":"text-emerald-700"}`}>{e.amount>0?"+":"−"}{formatNPR(Math.abs(e.amount))}</td></tr>)}</tbody></table></div>}</section>
  <FormDialog title={dialog==="new"?"Add payment account":dialog==="transfer"?"Transfer between accounts":"Reconcile account balance"} open={dialog!==null} onClose={()=>{if(!busy){setDialog(null);setError("");}}}>
  <form onSubmit={save} className="space-y-4">{dialog==="new"?<><Field label="Account name"><TextInput required autoFocus maxLength={100} placeholder="Cash, Bank, eSewa or Khalti" value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Type"><SelectInput value={kind} onChange={e=>setKind(e.target.value)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="wallet">Digital wallet</option></SelectInput></Field><Field label="Opening balance (Rs.)"><TextInput type="number" min="0" step="0.01" required value={opening} onChange={e=>setOpening(e.target.value)}/></Field><p className="text-xs text-neutral-500">Set the verified balance at your starting date. Do not enter old transactions again.</p></>:
  dialog==="transfer"?<><Field label="Transfer from"><SelectInput required value={from} onChange={e=>setFrom(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field><Field label="Transfer to"><SelectInput required value={to} onChange={e=>setTo(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field><Field label="Amount (Rs.)"><TextInput type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></Field><Field label="Notes (optional)"><TextInput maxLength={250} value={reason} onChange={e=>setReason(e.target.value)}/></Field></>:
  <><Field label="Account"><SelectInput value={reconAccount} onChange={e=>{setReconAccount(e.target.value);setCounted(String(accounts.find(a=>a.id===e.target.value)?.balance??0));}}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field><Field label="Counted / statement balance (Rs.)"><TextInput type="number" min="0" step="0.01" required value={counted} onChange={e=>setCounted(e.target.value)}/></Field><Field label="Reason for difference"><TextInput minLength={5} maxLength={250} required placeholder="Bank charge or earlier transaction" value={reason} onChange={e=>setReason(e.target.value)}/></Field><p className="text-xs text-neutral-500">The difference creates a permanent audit entry. It does not change sales or profit figures.</p></>}
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={()=>setDialog(null)}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy?"Saving…":dialog==="new"?"Create account":dialog==="transfer"?"Save transfer":"Save reconciliation"}</button></div>
  </form></FormDialog>
 </Reveal>;
}
