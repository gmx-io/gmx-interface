import cx from "classnames";

import { formatBalanceAmount } from "lib/numbers";

export function Amount({
  amount,
  decimals,
  isStable,
  className,
  symbol,
  symbolClassName,
  signed = false,
  emptyValue,
  showZero = false,
}: {
  amount: bigint | undefined;
  decimals: number;
  isStable: boolean | undefined;
  className?: string;
  symbol?: string;
  symbolClassName?: string;
  signed?: boolean;
  emptyValue?: string;
  showZero?: boolean;
}) {
  if (amount === undefined) {
    return emptyValue ?? null;
  }

  if (symbol) {
    return (
      <span className={className}>
        <span className="numbers">
          {formatBalanceAmount(amount, decimals, undefined, {
            isStable,
            signed,
            showZero,
          })}
        </span>{" "}
        <span className={symbolClassName}>{symbol}</span>
      </span>
    );
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
