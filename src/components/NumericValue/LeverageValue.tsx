import { formatLeverageParts } from "domain/synthetics/positions";

import { NumericValue, NumericValuePresentation } from "./NumericValue";

type Props = NumericValuePresentation & {
  leverage: bigint | undefined;
};

export function LeverageValue({ leverage, className, affixClassName, fallback }: Props) {
  return (
    <NumericValue
      parts={formatLeverageParts(leverage)}
      className={className}
      affixClassName={affixClassName}
      fallback={fallback}
    />
  );
}
