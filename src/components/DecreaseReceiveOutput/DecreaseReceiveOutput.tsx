import cx from "classnames";
import { Fragment, type ReactNode } from "react";

import type { DecreaseReceiveOutput } from "domain/synthetics/trade";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";

export function DecreaseReceiveOutputDisplay({
  outputs,
  className,
  secondaryValueClassName,
  emptyValue = "-",
}: {
  outputs: DecreaseReceiveOutput[];
  className?: string;
  secondaryValueClassName?: string;
  emptyValue?: ReactNode;
}) {
  if (outputs.length === 0) {
    return <>{emptyValue}</>;
  }

  return (
    <span className={cx("inline-flex flex-wrap items-center justify-end gap-x-4 gap-y-2", className)}>
      {outputs.map((output, index) => (
        <Fragment key={`${output.type}-${output.token.address}`}>
          {index > 0 && <span className="text-typography-secondary">+</span>}
          <AmountWithUsdBalance
            amount={output.amount}
            decimals={output.token.decimals}
            symbol={output.token.symbol}
            usd={output.usd}
            isStable={output.token.isStable}
            secondaryValueClassName={secondaryValueClassName}
          />
        </Fragment>
      ))}
    </span>
  );
}
