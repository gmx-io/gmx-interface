import { getNativeToken } from "config/tokens";
import { useMarkets } from "domain/synthetics/markets";
import { adaptToV1InfoTokens, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { InfoTokens, Token } from "domain/tokens";
import { mapValues } from "lodash";
import { useMemo } from "react";

type AvailableTokenOptions = {
  infoTokens: InfoTokens;
  availableSwapTokens: Token[];
  availableIndexTokens: Token[];
  availablePositionCollateralsByIndexMap: { [indexAddress: string]: Token[] };
};

export function useAvailableTokenOptions(chainId: number): AvailableTokenOptions {
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  return useMemo(() => {
    const markets = Object.values(marketsData || {});

    const collaterals = new Set<Token>();
    const indexTokens = new Set<Token>();
    const collateralsByIndexTokenMap: { [indexAddress: string]: Set<Token> } = {};
    const nativeToken = getNativeToken(chainId);

    for (const market of markets) {
      const longToken = getTokenData(tokensData, market.longTokenAddress);
      const shortToken = getTokenData(tokensData, market.shortTokenAddress);
      const indexToken = getTokenData(tokensData, market.indexTokenAddress, "native");

      if (!longToken || !shortToken || !indexToken) {
        continue;
      }

      if (longToken.isWrapped || shortToken.isWrapped) {
        collaterals.add(nativeToken);
      }

      collaterals.add(longToken);
      collaterals.add(shortToken);
      indexTokens.add(indexToken);

      collateralsByIndexTokenMap[indexToken.address] =
        collateralsByIndexTokenMap[indexToken.address] || new Set<Token>();

      collateralsByIndexTokenMap[indexToken.address].add(longToken);
      collateralsByIndexTokenMap[indexToken.address].add(shortToken);
    }

    return {
      infoTokens: adaptToV1InfoTokens(tokensData || {}),
      availableSwapTokens: Array.from(collaterals),
      availableIndexTokens: Array.from(indexTokens),
      availablePositionCollateralsByIndexMap: mapValues(collateralsByIndexTokenMap, (collaterals) =>
        Array.from(collaterals)
      ),
    };
  }, [chainId, marketsData, tokensData]);
}
