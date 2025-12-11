import { useRef } from "react";

import type { QuoteOft } from "domain/multichain/types";
import { formatBalanceAmount } from "lib/numbers";

export function useQuoteOftLimits({
  quoteOft,
  amountLD,
  isStable,
  decimals,
}: {
  quoteOft: QuoteOft | undefined;
  amountLD: bigint | undefined;
  isStable: boolean | undefined;
  decimals: number | undefined;
}) {
  const lastMinAmountLD = useRef<bigint | undefined>(undefined);
  const lastMaxAmountLD = useRef<bigint | undefined>(undefined);

  if (quoteOft) {
    lastMaxAmountLD.current = quoteOft.limit.maxAmountLD;
    lastMinAmountLD.current = quoteOft.limit.minAmountLD;
  }

  const isBelowLimit =
    lastMinAmountLD.current !== undefined && amountLD !== undefined && amountLD > 0n
      ? amountLD < lastMinAmountLD.current
      : false;

  const lowerLimitFormatted =
    isBelowLimit && decimals && lastMinAmountLD.current !== undefined
      ? formatBalanceAmount(lastMinAmountLD.current, decimals, undefined, {
          isStable,
        })
      : undefined;

  const isAboveLimit =
    lastMaxAmountLD.current !== undefined && amountLD !== undefined && amountLD > 0n
      ? amountLD > lastMaxAmountLD.current
      : false;

  const upperLimitFormatted =
    isAboveLimit && decimals && lastMaxAmountLD.current !== undefined
      ? formatBalanceAmount(lastMaxAmountLD.current, decimals, undefined, {
          isStable,
        })
      : undefined;

  return {
    isBelowLimit,
    lowerLimitFormatted,
    isAboveLimit,
    upperLimitFormatted,
  };
}
