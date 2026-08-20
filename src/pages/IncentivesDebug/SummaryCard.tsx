import type { ReactNode } from "react";

export function SummaryCard({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-8 bg-slate-900 p-16">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="mt-4 break-words text-16 font-medium text-typography-primary">{value}</div>
      {note ? <div className="text-caption mt-4 text-typography-secondary">{note}</div> : null}
    </div>
  );
}
