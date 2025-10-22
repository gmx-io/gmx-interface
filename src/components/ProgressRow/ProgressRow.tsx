import cx from "classnames";
import { ReactNode, useMemo } from "react";

import { bigMath } from "sdk/utils/bigmath";

type ProgressRowProps = {
  label: ReactNode;
  value?: ReactNode;
  currentValue?: bigint | undefined;
  totalValue?: bigint | undefined;
};

export function ProgressRow({ label, value, currentValue, totalValue }: ProgressRowProps) {
  const progress = useMemo(() => {
    if (currentValue === undefined || totalValue === undefined || totalValue === 0n) {
      return 0;
    }

    const cappedCurrent = currentValue > totalValue ? totalValue : currentValue;
    const precisionMultiplier = 10_000n;
    const progressInHundredths = bigMath.mulDiv(cappedCurrent, precisionMultiplier, totalValue);

    return Number(progressInHundredths) / 100;
  }, [currentValue, totalValue]);

  const barFillStyle = useMemo(() => {
    return { width: `${Math.min(Math.max(progress, 0), 100)}%` };
  }, [progress]);

  return (
    <div className={cx("flex flex-col gap-6")}>
      <div className="flex justify-between">
        <div className="font-medium text-typography-secondary">{label}</div>
        {value}
      </div>
      <div className="h-4 w-full rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-blue-300" style={barFillStyle} />
      </div>
    </div>
  );
}
