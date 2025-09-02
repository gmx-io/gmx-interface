import { useRef } from "react";

import type { QuoteOft } from "domain/multichain/types";
import { formatBalanceAmount } from "lib/numbers";

export function useQuoteOftLimits({
  quoteOft,
  inputAmount,
  isStable,
  decimals,
}: {
  quoteOft: QuoteOft | undefined;
  inputAmount: bigint | undefined;
  isStable: boolean | undefined;
  decimals: number | undefined;
}) {
  const lastMinAmountLD = useRef<bigint | undefined>(undefined);
  const lastMaxAmountLD = useRef<bigint | undefined>(undefined);

  if (quoteOft && quoteOft.limit.maxAmountLD && quoteOft.limit.minAmountLD) {
    lastMaxAmountLD.current = quoteOft.limit.maxAmountLD as bigint;
    lastMinAmountLD.current = quoteOft.limit.minAmountLD as bigint;
  }

  const isBelowLimit =
    lastMinAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount < lastMinAmountLD.current
      : false;

  const lowerLimitFormatted =
    isBelowLimit && decimals && lastMinAmountLD.current !== undefined
      ? formatBalanceAmount(lastMinAmountLD.current, decimals, undefined, {
          isStable,
        })
      : undefined;

  const isAboveLimit =
    lastMaxAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount > lastMaxAmountLD.current
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
