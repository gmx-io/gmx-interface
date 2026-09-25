import { FormatDeltaUsdOptions, formatDeltaUsdParts } from "lib/numbers";

import { NumericValue, NumericValuePresentation } from "./NumericValue";

type Props = NumericValuePresentation &
  FormatDeltaUsdOptions & {
    deltaUsd: bigint | undefined;
    percentage?: bigint;
  };

export function DeltaUsdValue({ deltaUsd, percentage, className, affixClassName, fallback, ...opts }: Props) {
  return (
    <NumericValue
      parts={formatDeltaUsdParts(deltaUsd, percentage, opts)}
      className={className}
      affixClassName={affixClassName}
      fallback={fallback}
    />
  );
}
