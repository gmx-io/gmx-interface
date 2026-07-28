import type { ReactNode } from "react";

export function ShareCardStat({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">{label}</p>
      <p className="whitespace-nowrap text-13 font-medium text-white">{children}</p>
    </div>
  );
}
