import { useMemo } from "react";
import { NATIVE_TOKEN_ADDRESS, getWrappedToken } from "config/tokens";
import { Market, useMarketsData } from "domain/synthetics/markets";
import { adaptToInfoTokens, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { InfoTokens, Token } from "domain/tokens";
import { uniq } from "lodash";
import { useChainId } from "lib/chains";

type AvailableSwapOptions = {
  infoTokens: InfoTokens;
  availableSwapTokens: Token[];
  availableIndexTokens: Token[];
  availablePositionCollaterals: Token[];
};

export function useAvailableSwapOptions(p: { selectedIndexTokenAddress?: string }): AvailableSwapOptions {
  const { chainId } = useChainId();
  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const { longCollaterals, shortCollaterals, indexTokens, collateralsByIndexMap } = useMemo(() => {
    const markets = Object.values(marketsData);
    const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)!;
    const wrappedToken = getWrappedToken(chainId);

    const longMap: { [address: string]: Token } = {};
    const shortMap: { [address: string]: Token } = {};
    const indexMap: { [address: string]: Token } = {};
    const collateralsByIndexMap: { [indexAddress: string]: { [collateral: string]: Token } } = {};
    const marketsPerpsMap: { [key: string]: Market[] } = {};

    for (const market of markets) {
      const longToken = getTokenData(tokensData, market.longTokenAddress);
      const shortToken = getTokenData(tokensData, market.shortTokenAddress);

      if (!longToken || !shortToken) continue;

      if (longToken.address === wrappedToken.address) {
        longMap[nativeToken.address] = nativeToken;
      }

      longMap[longToken.address] = longToken;

      if (shortToken.address === wrappedToken.address) {
        shortMap[nativeToken.address] = nativeToken;
      }

      shortMap[shortToken.address] = shortToken;

      if (!market.isSpotOnly) {
        const indexToken =
          market.indexTokenAddress === wrappedToken.address
            ? nativeToken
            : getTokenData(tokensData, market.indexTokenAddress)!;

        indexMap[indexToken.address] = indexToken;
        collateralsByIndexMap[indexToken.address] = collateralsByIndexMap[indexToken.address] || {};
        collateralsByIndexMap[indexToken.address][longToken.address] = longToken;
        collateralsByIndexMap[indexToken.address][shortToken.address] = shortToken;

        const marketPerpKey = `${market.indexTokenAddress}-${market.perp}`;
        marketsPerpsMap[marketPerpKey] = marketsPerpsMap[marketPerpKey] || [];
        marketsPerpsMap[marketPerpKey].push(market);
      }
    }

    return {
      longCollaterals: Object.values(longMap),
      shortCollaterals: Object.values(shortMap),
      indexTokens: Object.values(indexMap),
      collateralsByIndexMap,
    };
  }, [chainId, marketsData, tokensData]);

  const availableSwapTokens: Token[] = uniq(longCollaterals.concat(shortCollaterals));
  const availableIndexTokens: Token[] = indexTokens;
  const availablePositionCollaterals = p.selectedIndexTokenAddress
    ? (Object.values(collateralsByIndexMap[p.selectedIndexTokenAddress] || {}) as Token[])
    : [];

  return {
    infoTokens,
    availableSwapTokens,
    availableIndexTokens,
    availablePositionCollaterals,
  };
}
