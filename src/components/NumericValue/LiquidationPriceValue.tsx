import { FormatLiquidationPriceOptions, formatLiquidationPriceParts } from "domain/synthetics/positions";

import { NumericValue, NumericValuePresentation } from "./NumericValue";

type Props = NumericValuePresentation &
  FormatLiquidationPriceOptions & {
    liquidationPrice: bigint | undefined;
  };

export function LiquidationPriceValue({ liquidationPrice, className, affixClassName, fallback, ...opts }: Props) {
  return (
    <NumericValue
      parts={formatLiquidationPriceParts(liquidationPrice, opts)}
      className={className}
      affixClassName={affixClassName}
      fallback={fallback}
    />
  );
}
