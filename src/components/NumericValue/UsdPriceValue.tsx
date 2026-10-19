import { FormatUsdOptions, formatUsdPriceParts } from "lib/numbers";

import { NumericValue, NumericValuePresentation } from "./NumericValue";

type Props = NumericValuePresentation &
  FormatUsdOptions & {
    price: bigint | undefined;
  };

export function UsdPriceValue({ price, className, affixClassName, fallback, ...opts }: Props) {
  return (
    <NumericValue
      parts={formatUsdPriceParts(price, opts)}
      className={className}
      affixClassName={affixClassName}
      fallback={fallback}
    />
  );
}
