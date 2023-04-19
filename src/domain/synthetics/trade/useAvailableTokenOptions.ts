import { getNativeToken, getTokensMap } from "config/tokens";
import { useMarkets } from "domain/synthetics/markets";
import { InfoTokens, Token } from "domain/tokens";
import { useMemo } from "react";
import { adaptToV1InfoTokens, useAvailableTokensData } from "../tokens";

export type AvailableTokenOptions = {
  tokensMap: { [address: string]: Token };
  infoTokens: InfoTokens;
  swapTokens: Token[];
  indexTokens: Token[];
};

export function useAvailableTokenOptions(chainId: number): AvailableTokenOptions {
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  return useMemo(() => {
    const markets = Object.values(marketsData || {});
    const tokensMap = getTokensMap(chainId);

    const collaterals = new Set<Token>();
    const indexTokens = new Set<Token>();
    const nativeToken = getNativeToken(chainId);

    for (const market of markets) {
      const longToken = tokensMap[market.longTokenAddress];
      const shortToken = tokensMap[market.shortTokenAddress];

      const indexToken = tokensMap[market.indexTokenAddress]?.isWrapped
        ? nativeToken
        : tokensMap[market.indexTokenAddress];

      if (!longToken || !shortToken || !indexToken) {
        continue;
      }

      if (longToken.isWrapped || shortToken.isWrapped) {
        collaterals.add(nativeToken);
      }

      collaterals.add(longToken);
      collaterals.add(shortToken);

      if (!market.isSpotOnly) {
        indexTokens.add(indexToken);
      }
    }

    return {
      tokensMap,
      swapTokens: Array.from(collaterals),
      indexTokens: Array.from(indexTokens),
      infoTokens: adaptToV1InfoTokens(tokensData || {}),
    };
  }, [chainId, marketsData, tokensData]);
}
