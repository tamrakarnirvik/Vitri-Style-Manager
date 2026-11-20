import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <span className="rounded-lg bg-neutral-100 p-2 text-neutral-700">
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-[clamp(1.35rem,2vw,1.8rem)] font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-5 text-neutral-500">{detail}</p>
    </article>
  );
}
