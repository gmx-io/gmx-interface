import cx from "classnames";

import { formatPercentage, formatUsd } from "lib/numbers";

type Props = {
  pnlPercentage: bigint;
  pnlUsd: bigint;
  showPnlAmounts: boolean;
  zeroClassName?: string;
};

export function ShareCardPnlValue({ pnlPercentage, pnlUsd, showPnlAmounts, zeroClassName = "text-[#0FDE8D]" }: Props) {
  const pnlClassName = pnlPercentage > 0n ? "text-[#0FDE8D]" : pnlPercentage < 0n ? "text-[#FF506A]" : zeroClassName;

  return (
    <div className="flex items-end gap-4">
      <h3 className={cx("text-h1 max-md:text-h2", pnlClassName)}>
        {formatPercentage(pnlPercentage, { signed: true })}
      </h3>
      {showPnlAmounts && (
        <p className={cx("text-body-medium pb-8 font-medium", pnlClassName)}>
          {formatUsd(pnlUsd, { displayPlus: true })}
        </p>
      )}
    </div>
  );
}
