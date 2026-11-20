"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DaySale } from "@/lib/business";
import { formatNPR } from "@/lib/format";

export function PeriodChart({days}:{days:DaySale[]}){
 const data=days.map(d=>({label:d.date.slice(5),sales:d.sales}));
 return <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><h2 className="font-semibold">Sales across selected dates</h2><p className="mt-1 text-xs text-neutral-500">All {days.length} days in your report · Nepal time</p><div className="mt-6 h-[270px] w-full" role="img" aria-label="Daily sales for the selected period">
 <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={data} margin={{top:5,right:8,left:-18,bottom:0}}>
  <defs><linearGradient id="periodSalesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#171717" stopOpacity={0.12}/><stop offset="100%" stopColor="#171717" stopOpacity={0}/></linearGradient></defs>
  <CartesianGrid vertical={false} stroke="#eeeeee" strokeDasharray="3 4"/>
  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fill:"#737373",fontSize:11}} minTickGap={28} tickMargin={12}/>
  <YAxis tickLine={false} axisLine={false} tick={{fill:"#737373",fontSize:11}} tickFormatter={(n:number)=>`${n/1000}k`} width={48}/>
  <Tooltip contentStyle={{borderColor:"#e5e5e5",borderRadius:12,fontSize:12}} formatter={v=>[formatNPR(Number(v)),"Sales"]}/>
  <Area type="monotone" dataKey="sales" stroke="#171717" strokeWidth={2.5} fill="url(#periodSalesGradient)" isAnimationActive={false}/>
 </AreaChart></ResponsiveContainer></div></section>;
}
