import { useMemo } from "react";

import { MarketsData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";

export function useFixedAddreseses(marketsData: MarketsData | undefined, tokensData: TokensData | undefined) {
  return useMemo(() => {
    return Object.keys(marketsData || {})
      .concat(Object.keys(tokensData || {}))
      .reduce(
        (acc, address) => {
          acc[address.toLowerCase()] = address;

          return acc;
        },
        {} as { [lowerAddress: string]: string }
      );
  }, [marketsData, tokensData]);
}
