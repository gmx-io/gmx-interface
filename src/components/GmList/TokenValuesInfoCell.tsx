import cx from "classnames";
import { ReactNode } from "react";

import { ShimmerText } from "components/ShimmerText/ShimmerText";

export function TokenValuesInfoCell({
  value,
  usd,
  symbol,
  singleLine,
  className,
  isLoading = false,
}: {
  value: string;
  usd?: ReactNode;
  symbol?: string;
  singleLine?: boolean;
  className?: string;
  isLoading?: boolean;
}) {
  const isNumber = !isNaN(Number(value.replace(/,/g, "")));
  const content = (
    <>
      {usd && (
        <div className={cx("whitespace-nowrap text-typography-primary numbers", className)}>
          {isLoading ? <ShimmerText>{usd}</ShimmerText> : usd}
        </div>
      )}
      {value && (
        <div className="whitespace-nowrap text-12 text-typography-secondary numbers">
          ({symbol && isNumber ? `${value} ${symbol}` : value})
        </div>
      )}
    </>
  );
  return singleLine ? <div className="flex gap-4">{content}</div> : <div>{content}</div>;
}
