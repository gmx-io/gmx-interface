import { ReactNode } from "react";

export function SummaryCard({ label, value, highlight }: { label: ReactNode; value: ReactNode; highlight?: boolean }) {
  return (
    <div className="rounded-8 bg-slate-900 p-16">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className={`mt-4 text-16 font-medium ${highlight ? "text-yellow-300" : "text-typography-primary"}`}>
        {value}
      </div>
    </div>
  );
}
