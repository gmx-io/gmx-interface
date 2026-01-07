import cx from "classnames";

import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
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
  usd?: string;
  symbol?: string;
  singleLine?: boolean;
  className?: string;
  isLoading?: boolean;
}) {
  const isNumber = !isNaN(Number(value.replace(/,/g, "")));
  const UsdWrapper = isLoading ? ShimmerText : NoopWrapper;
  const content = (
    <>
      {usd && (
        <div className={cx("whitespace-nowrap numbers", className)}>
          <UsdWrapper>{usd}</UsdWrapper>
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
