import { FormatUsdOptions, formatUsdParts } from "lib/numbers";

import { NumericValue, NumericValuePresentation } from "./NumericValue";

type Props = NumericValuePresentation &
  FormatUsdOptions & {
    usd: bigint | undefined;
  };

export function UsdValue({ usd, className, affixClassName, fallback, ...opts }: Props) {
  return (
    <NumericValue
      parts={formatUsdParts(usd, opts)}
      className={className}
      affixClassName={affixClassName}
      fallback={fallback}
    />
  );
}
