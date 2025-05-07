import { ReactNode } from "react";

export function PoolsDetailsMarketAmount({
  value,
  secondaryValue,
  label,
}: {
  value: string | undefined;
  secondaryValue?: string;
  label?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-body-medium text-slate-100">{label}</div>
      <span className="flex items-center gap-8">
        <span className="text-font-number text-[20px]">{value}</span>
        {secondaryValue ? (
          <span className="text-font-number text-body-large text-slate-100">{`(${secondaryValue})`}</span>
        ) : null}
      </span>
    </div>
  );
}
