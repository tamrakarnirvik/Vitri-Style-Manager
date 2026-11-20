"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DaySale } from "@/lib/business-client";
import { formatNPR } from "@/lib/format";

export function SalesChart({ days, initialRange = 7 }: { days: DaySale[]; initialRange?: 7 | 30 }) {
  const [range, setRange] = useState<7 | 30>(initialRange);
  const data = days.slice(-range).map((day) => ({
    date: day.date,
    label: day.date.slice(5),
    sales: day.sales,
  }));
  const total = data.reduce((sum, day) => sum + day.sales, 0);

  return (
    <section className="vs-card min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[#26364c]">Sales trend</h2>
          <p className="mt-1 text-xs text-[#8390a2]">Non-cancelled sales · Asia/Kathmandu</p>
        </div>
        <div role="group" aria-label="Sales chart time range" className="inline-flex items-center rounded-[9px] border border-[#e5eaf1] bg-[#f7f9fc] p-[3px]">
          {([7,30] as const).map((value) => (
            <button
              key={value} type="button" aria-pressed={range === value}
              onClick={() => setRange(value)}
              className={`rounded-[7px] px-3 py-[6px] text-xs font-semibold transition-colors duration-150 ${range === value ? "bg-white text-[#2a5cba] shadow-sm ring-1 ring-[#e2eaf8]" : "text-[#7a899f] hover:text-[#283b5b]"}`}
            >{value} days</button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <p className="text-2xl font-bold tracking-[-.045em] text-[#1d2a43] tabular-nums">{formatNPR(total)}</p>
        <p className="text-xs text-[#8a97a8]">for selected {range}-day window</p>
      </div>
      <div className="mt-4 h-[220px] w-full min-w-0 sm:h-[270px]" role="img" aria-label={`Sales trend over the last ${range} days`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 15, right: 10, bottom: 1, left: -16 }}>
            <defs>
              <linearGradient id="vsSalesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3f7af2" stopOpacity={.18}/>
                <stop offset="100%" stopColor="#3f7af2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf1f7" strokeDasharray="3 5" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={11} minTickGap={18} tick={{ fill: "#93a0b1", fontSize: 13 }}/>
            <YAxis width={55} tickLine={false} axisLine={false} tick={{ fill: "#93a0b1", fontSize: 13 }} tickFormatter={(value: number) => value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(value)}/>
            <Tooltip
              cursor={{ stroke: "#bacbec", strokeDasharray: "4 5" }}
              contentStyle={{ background: "#fff", border: "1px solid #e3eaf5", borderRadius: 12, boxShadow: "0 8px 24px rgba(20,48,97,.07)", fontSize: 13 }}
              formatter={(value) => [formatNPR(Number(value ?? 0)), "Sales"]}
            />
            <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b76eb" strokeWidth={2.6} fill="url(#vsSalesFill)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: "#3478f6", strokeWidth: 2 }} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
