import cx from "classnames";
import { Fragment, type ReactNode } from "react";

import type { DecreaseReceiveOutput } from "domain/synthetics/trade";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";

export function DecreaseReceiveOutputDisplay({
  outputs,
  className,
  secondaryValueClassName,
  emptyValue = "-",
  layout = "inline",
}: {
  outputs: DecreaseReceiveOutput[];
  className?: string;
  secondaryValueClassName?: string;
  emptyValue?: ReactNode;
  layout?: "inline" | "stacked";
}) {
  if (outputs.length === 0) {
    return <>{emptyValue}</>;
  }

  const isStacked = layout === "stacked";

  return (
    <span
      className={cx(
        isStacked
          ? "inline-flex flex-col items-end gap-2"
          : "inline-flex flex-wrap items-center justify-end gap-x-4 gap-y-2",
        className
      )}
    >
      {outputs.map((output, index) => {
        const content = (
          <>
            {index > 0 && <span className="text-typography-secondary">+</span>}
            <AmountWithUsdBalance
              amount={output.amount}
              decimals={output.token.decimals}
              symbol={output.token.symbol}
              usd={output.usd}
              isStable={output.token.isStable}
              secondaryValueClassName={secondaryValueClassName}
            />
          </>
        );

        return isStacked ? (
          <span key={`${output.type}-${output.token.address}`} className="inline-flex items-center justify-end gap-x-4">
            {content}
          </span>
        ) : (
          <Fragment key={`${output.type}-${output.token.address}`}>{content}</Fragment>
        );
      })}
    </span>
  );
}
