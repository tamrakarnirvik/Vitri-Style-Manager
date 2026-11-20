"use client";

import { useState, type FormEvent } from "react";
import { Download, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PeriodReport } from "@/lib/business";
import { formatNPR } from "@/lib/format";
import { primaryButton, secondaryButton } from "@/components/ui/form-fields";
import { Reveal } from "@/components/ui/reveal";
import { PeriodChart } from "@/components/reports/period-chart";

function kathmanduToday() {
 const formatter = new Intl.DateTimeFormat("en-CA", {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Kathmandu"});
 const p=formatter.formatToParts(new Date());
 return ["year","month","day"].map(k=>p.find(x=>x.type===k)?.value).join("-");
}
function dateBefore(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);}
function isValidDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(new Date(date).getTime());}
function daysBetween(from:string,to:string){return Math.round((Date.parse(to)-Date.parse(from))/(24*60*60*1000));}
function parseReport(d:Record<string,unknown>):PeriodReport{
 const num=(x:unknown)=>Number(x??0);
 return {from:String(d.from),to:String(d.to),sales:num(d.sales),orders:num(d.orders),
 product_cost:num(d.product_cost),received:num(d.received),expenses:num(d.expenses),purchases:num(d.purchases),
 refunds:num(d.refunds),write_offs:num(d.write_offs),profit:num(d.profit),net_cash:num(d.net_cash),
 days:Array.isArray(d.days)?d.days.map(x=>({date:String(x.date),sales:num(x.sales)})):[]};
}
const csvCell=(v:string|number)=>`"${String(v).replaceAll('"','""')}"`;
export function ReportsWorkspace(){
 const [from,setFrom]=useState(()=>dateBefore(kathmanduToday(),29));const [to,setTo]=useState(kathmanduToday);
 const [report,setReport]=useState<PeriodReport|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 async function load(e?:FormEvent<HTMLFormElement>){e?.preventDefault();setError("");
  if(!isValidDate(from)||!isValidDate(to)||daysBetween(from,to)<0||daysBetween(from,to)>92){setError("Choose valid dates spanning at most 93 days.");return;}
  setLoading(true);try{const db=createClient();const {data,error:x}=await db.rpc("period_report_v4",{p_from:from,p_to:to});if(x)throw x;if(!data)throw new Error("No report data returned");setReport(parseReport(data as Record<string,unknown>));}
  catch(e){setError(e instanceof Error?e.message:"Could not generate report.");setReport(null);}finally{setLoading(false);}
 }
 function exportCsv(){if(!report)return;
  const rows:Array<Array<string|number>>=[
   ["vitristyle business report",`${report.from} to ${report.to}`],
   ["Sales",report.sales],["Orders",report.orders],["Product cost of sales",report.product_cost],["Operating expenses",report.expenses],["Inventory write-offs",report.write_offs],["Estimated operating profit",report.profit],
   ["Payments received",report.received],["Supplier stock purchases",report.purchases],["Refunds paid",report.refunds],["Net operating cash movement",report.net_cash],
   [],["Date (Nepal)","Sales (NPR)"],...report.days.map(d=>[d.date,d.sales])
  ];
  const content="\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a");a.href=url;a.download=`vitristyle-report-${report.from}-to-${report.to}.csv`;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <Reveal>
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Financial analysis</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Reports</h1><p className="mt-2 text-sm text-neutral-500">Choose a date range in Nepal time, review your business and export to Excel-friendly CSV.</p></div>{report&&<button className={secondaryButton} onClick={exportCsv}><Download size={16}/> Export CSV</button>}</div>
  <form onSubmit={load} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-5"><label className="text-xs font-semibold text-neutral-600">From<input type="date" required value={from} onChange={e=>setFrom(e.target.value)} className="mt-2 block rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900"/></label><label className="text-xs font-semibold text-neutral-600">To<input type="date" required value={to} onChange={e=>setTo(e.target.value)} className="mt-2 block rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900"/></label><button type="submit" className={primaryButton} disabled={loading||!from||!to}><RefreshCw size={16} className={loading?"animate-spin":""}/>{loading?"Generating…":"Generate report"}</button></form>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {!report&&!loading&&!error&&<p className="mt-5 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">Select a date range, then click Generate report.</p>}
  {report&&<>
   <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
    {label:"Sales",value:report.sales},{label:"Payments received",value:report.received},{label:"Operating expenses",value:report.expenses},{label:"Estimated profit",value:report.profit},
    {label:"Inventory purchased",value:report.purchases},{label:"Refunds paid",value:report.refunds},{label:"Inventory write-offs",value:report.write_offs},{label:"Net cash movement",value:report.net_cash},
   ].map(s=><div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-transform motion-safe:hover:-translate-y-0.5"><p className="text-xs text-neutral-500">{s.label}</p><p className="mt-2 text-xl font-bold tabular-nums">{formatNPR(s.value)}</p></div>)}</div>
   <div className="mt-5"><PeriodChart days={report.days}/></div>
   <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-6"><h2 className="font-semibold">How this report is calculated</h2><div className="mt-4 grid gap-3 text-sm text-neutral-600 sm:grid-cols-2"><p>Estimated profit = sales − cost of goods sold − operating expenses − recorded non-restockable return write-offs.</p><p>Net operating cash movement = customer receipts − operating expenses − paid stock purchases − customer refunds.</p></div><p className="mt-4 text-xs leading-5 text-neutral-500">This is a simplified operational report, not a formal tax or accounting statement. Full-order returns remove the original sale from historical sales reporting; cash refunds are dated when issued. Transfers and reconciliation differences are excluded from operating cash movement. Manual damaged-stock adjustments do not automatically book a profit-and-loss expense.</p></section>
  </>}
 </Reveal>;
}
