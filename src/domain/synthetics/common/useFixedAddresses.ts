import { useMemo } from "react";
import { TokensData } from "domain/synthetics/tokens";
import { MarketsData } from "domain/synthetics/markets";

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
