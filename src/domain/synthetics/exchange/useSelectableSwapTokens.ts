import { NATIVE_TOKEN_ADDRESS, getWrappedToken } from "config/tokens";
import { getMarkets, useMarketsData } from "domain/synthetics/markets";
import { adaptToInfoTokens, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useMemo } from "react";

export function useSelectableSwapTokens(p: { indexTokenAddress?: string; isSwap: boolean }) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const markets = getMarkets(marketsData);

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const { longCollaterals, shortCollaterals, indexTokens, indexCollateralsMap } = useMemo(() => {
    const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)!;
    const wrappedToken = getWrappedToken(chainId);

    const longMap: { [address: string]: Token } = {};
    const shortMap: { [address: string]: Token } = {};
    const indexMap: { [address: string]: Token } = {};

    const indexCollateralsMap: { [indexAddress: string]: { [collateral: string]: Token } } = {};

    for (const market of markets) {
      if (market.longTokenAddress === wrappedToken.address) {
        longMap[nativeToken.address] = nativeToken;
      }

      if (market.shortTokenAddress === wrappedToken.address) {
        shortMap[nativeToken.address] = nativeToken;
      }

      const longToken = getTokenData(tokensData, market.longTokenAddress)!;
      const shortToken = getTokenData(tokensData, market.shortTokenAddress)!;

      longMap[longToken.address] = longToken;
      shortMap[shortToken.address] = shortToken;

      const indexToken =
        market.indexTokenAddress === wrappedToken.address
          ? nativeToken
          : getTokenData(tokensData, market.indexTokenAddress)!;

      indexMap[indexToken.address] = indexToken;

      indexCollateralsMap[indexToken.address] = indexCollateralsMap[indexToken.address] || {};
      indexCollateralsMap[indexToken.address][longToken.address] = longToken;
      indexCollateralsMap[indexToken.address][shortToken.address] = shortToken;
    }

    return {
      longCollaterals: Object.values(longMap) as Token[],
      shortCollaterals: Object.values(shortMap) as Token[],
      indexTokens: Object.values(indexMap) as Token[],
      indexCollateralsMap,
    };
  }, [chainId, markets, tokensData]);

  const availableFromTokens: Token[] = longCollaterals.concat(shortCollaterals);
  const availableToTokens: Token[] = p.isSwap ? availableFromTokens : indexTokens;

  const availableCollaterals =
    !p.isSwap && p.indexTokenAddress
      ? (Object.values(indexCollateralsMap[p.indexTokenAddress] || {}) as Token[])
      : undefined;

  return {
    availableFromTokens,
    availableToTokens,
    availableCollaterals,
    infoTokens,
  };
}
