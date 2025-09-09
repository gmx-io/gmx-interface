import cx from "classnames";

import { formatBalanceAmount } from "lib/numbers";

export function Amount({
  amount,
  decimals,
  isStable,
  className,
  signed = false,
}: {
  amount: bigint | undefined;
  decimals: number;
  isStable: boolean | undefined;
  className?: string;
  signed?: boolean;
}) {
  if (amount === undefined) {
    return null;
  }

  return (
    <span className={cx("numbers", className)}>
      {formatBalanceAmount(amount, decimals, undefined, {
        isStable,
        signed,
      })}
    </span>
  );
}
