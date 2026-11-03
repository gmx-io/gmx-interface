import type { ReactNode } from "react";

export function ShareCardStat({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-[#A0A3C4]">{label}</p>
      <p className="text-body-small whitespace-nowrap font-medium text-textIcon-onButton">{children}</p>
    </div>
  );
}
