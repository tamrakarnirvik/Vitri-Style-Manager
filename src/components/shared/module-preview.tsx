import Link from "next/link";
import { ArrowLeft, CheckCircle2, Construction } from "lucide-react";

type ModulePreviewProps = {
  title: string;
  description: string;
  plannedFor: string;
  features: string[];
};

export function ModulePreview({ title, description, plannedFor, features }: ModulePreviewProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900">
        <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
      </Link>
      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10">
        <div className="inline-flex rounded-xl bg-neutral-100 p-3"><Construction size={26} aria-hidden="true" /></div>
        <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-neutral-400 uppercase">{plannedFor}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-neutral-600">{description}</p>
        <div className="mt-7 border-t border-neutral-100 pt-6">
          <h2 className="text-sm font-semibold">Features planned for this module</h2>
          <ul className="mt-4 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-neutral-600">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-neutral-500" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-7 rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-500">
          This is a navigation placeholder, not a functioning transaction form. The dashboard currently displays mock data only.
        </div>
      </div>
    </div>
  );
}
