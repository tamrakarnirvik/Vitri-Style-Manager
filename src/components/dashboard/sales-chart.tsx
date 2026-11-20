"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DaySale } from "@/lib/business";
import { formatNPR } from "@/lib/format";

export function SalesChart({ days }: { days: DaySale[] }) {
  const [range, setRange] = useState<7 | 30>(7);
  const data = days.slice(-range).map((d) => ({ label: d.date.slice(5), sales: d.sales }));
  return <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Sales overview</h2><p className="mt-1 text-xs text-neutral-500">Actual confirmed sales · Nepal time</p></div>
      <div role="group" aria-label="Chart date range" className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">{([7,30] as const).map((n)=><button key={n} type="button" aria-pressed={range===n} onClick={()=>setRange(n)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${range===n ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"}`}>{n} days</button>)}</div>
    </div>
    <div className="mt-7 h-[270px] w-full min-w-0" role="img" aria-label={`Sales over the last ${range} days`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={data} margin={{ top: 5, right: 3, left: -20, bottom: 0 }}>
        <defs><linearGradient id="realSalesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#171717" stopOpacity={0.12}/><stop offset="100%" stopColor="#171717" stopOpacity={0.005}/></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#eeeeee" strokeDasharray="3 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fill:"#737373",fontSize:11}} minTickGap={24} tickMargin={12}/>
        <YAxis tickLine={false} axisLine={false} tick={{fill:"#737373",fontSize:11}} tickFormatter={(n: number)=>`${n/1000}k`} width={48}/>
        <Tooltip cursor={{stroke:"#a3a3a3",strokeDasharray:"4 4"}} contentStyle={{borderColor:"#e5e5e5",borderRadius:12,fontSize:12}} formatter={(value)=>[formatNPR(Number(value)),"Sales"]} />
        <Area type="monotone" dataKey="sales" stroke="#171717" strokeWidth={2.5} fill="url(#realSalesArea)" dot={false} activeDot={{r:4}} isAnimationActive={false}/>
      </AreaChart></ResponsiveContainer>
    </div>
  </section>;
}
