import { BigNumberish, formatAmountHumanParts } from "lib/numbers";

import { NumericValue, NumericValuePresentation } from "./NumericValue";

type Props = NumericValuePresentation & {
  amount: BigNumberish | undefined;
  decimals: number;
  showDollar?: boolean;
  displayDecimals?: number;
};

export function AmountHumanValue({
  amount,
  decimals,
  showDollar,
  displayDecimals,
  className,
  affixClassName,
  fallback,
}: Props) {
  return (
    <NumericValue
      parts={formatAmountHumanParts(amount, decimals, showDollar, displayDecimals)}
      className={className}
      affixClassName={affixClassName}
      fallback={fallback}
    />
  );
}
