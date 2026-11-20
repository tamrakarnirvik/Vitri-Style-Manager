import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-700 focus:ring-2 focus:ring-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-100";
export const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
export const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 active:scale-[0.99] motion-reduce:transition-none";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-neutral-700"><span>{label}</span>{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
