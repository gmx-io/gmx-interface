import { ReactNode } from "react";

export function HistoryControl({ icon, label, onClick }: { icon: ReactNode; label: ReactNode; onClick?: () => void }) {
  return (
    <button className="group flex items-center gap-4 px-12 py-8 text-slate-100 hover:text-slate-400" onClick={onClick}>
      <div className="size-16">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
