import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

// Text stays at 16px on phones (avoids iPhone zoom-on-focus), 15px on desktop.
export const inputClass =
  "w-full min-h-12 rounded-xl border border-[#e2e9f2] bg-white px-3.5 py-3 text-base text-[#25354e] outline-none transition-colors focus:border-[#729ef2] focus:ring-2 focus:ring-[#e6efff] disabled:cursor-not-allowed disabled:bg-[#f1f4f8] sm:text-[15px]";
export const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#2563eb] bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e2e9f2] bg-white px-4 py-3 text-sm font-semibold text-[#3c4f69] transition-colors hover:bg-[#f6f9fd] active:scale-[.99]";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-semibold text-[#50627e]"><span>{label}</span>{children}</label>;
}
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
