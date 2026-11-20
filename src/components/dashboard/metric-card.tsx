import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  emphasis?: "primary" | "neutral";
};

export function MetricCard({ label, value, detail, icon: Icon, emphasis = "neutral" }: MetricCardProps) {
  return (
    <article className={`vs-card vs-card-hover relative min-w-0 min-h-[145px] overflow-hidden p-3.5 sm:min-h-[164px] sm:p-6 ${emphasis === "primary" ? "border-[#cbdfff]" : ""}`}>
      {emphasis === "primary" && <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[#3478f6]" />}
      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 text-[13px] font-semibold leading-5 text-[#6b788d] sm:text-sm">{label}</p>
        <span className="vs-soft-icon !h-8 !w-8 shrink-0 sm:!h-[37px] sm:!w-[37px]"><Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>
      </div>
      <p className="mt-3 break-words text-[clamp(1.13rem,4.6vw,1.95rem)] font-bold leading-tight tracking-[-.04em] text-[#1b2a43] tabular-nums sm:text-[clamp(1.5rem,2vw,1.95rem)]">{value}</p>
      <p className="mt-2 text-xs leading-[1.45] text-[#7c889b]">{detail}</p>
    </article>
  );
}
