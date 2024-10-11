import { NATIVE_TOKEN_ADDRESS, getTokensMap } from "config/tokens";
import { GlvAndGmMarketsInfoData, Market, MarketInfo, MarketsData, isMarketInfo } from "domain/synthetics/markets";
import { InfoTokens, Token, getMidPrice } from "domain/tokens";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { isGlvInfo } from "../markets/glv";
import { TokenData, TokensData, adaptToV1InfoTokens, convertToUsd } from "../tokens";
import { SORTED_MARKETS_KEY } from "config/localStorage";
import { SORTED_MARKETS } from "config/static/sortedMarkets";

export type AvailableTokenOptions = {
  tokensMap: { [address: string]: Token };
  infoTokens: InfoTokens;
  swapTokens: TokenData[];
  indexTokens: TokenData[];
  sortedIndexTokensWithPoolValue: string[];
  sortedLongAndShortTokens: string[];
  sortedAllMarkets: MarketInfo[];
  sortedMarketConfigs: Market[];
};

function getCachedSortedMarketAddresses(): string[] {
  const cached = localStorage.getItem(SORTED_MARKETS_KEY);

  if (cached) {
    return JSON.parse(cached);
  }

  return SORTED_MARKETS;
}

export function useAvailableTokenOptions(
  chainId: number,
  p: {
    marketsInfoData?: GlvAndGmMarketsInfoData;
    marketsData?: MarketsData;
    tokensData?: TokensData;
    marketTokens?: TokensData;
  }
): AvailableTokenOptions {
  const { marketsInfoData, marketsData, tokensData, marketTokens } = p;

  return useMemo(() => {
    const marketsInfo = Object.values(marketsInfoData || {})
      .filter((market) => !market.isDisabled)
      .sort((a, b) => {
        const tokenA = isGlvInfo(a) ? a.glvToken : a.indexToken;
        const tokenB = isGlvInfo(b) ? b.glvToken : b.indexToken;
        return tokenA?.symbol.localeCompare(tokenB?.symbol);
      });

    const allMarkets = new Set<MarketInfo>();
    const tokensMap = getTokensMap(chainId);
    const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

    const indexTokens = new Set<TokenData>();
    const indexTokensWithPoolValue: { [address: string]: bigint } = {};

    const collaterals = new Set<TokenData>();

    const longTokensWithPoolValue: { [address: string]: bigint } = {};
    const shortTokensWithPoolValue: { [address: string]: bigint } = {};

    for (const marketInfo of marketsInfo) {
      if (isGlvInfo(marketInfo)) {
        if (marketInfo.isDisabled) {
          continue;
        }

        marketInfo.markets.forEach((market) => {
          const gmMarket = marketsInfoData?.[market.address];

          if (!gmMarket || !isMarketInfo(gmMarket)) {
            return;
          }

          const gmToken = tokensData?.[gmMarket.marketTokenAddress];

          if (gmToken) {
            indexTokens.add(gmToken);
          }
        });

        continue;
      }

      const longToken = marketInfo.longToken;
      const shortToken = marketInfo.shortToken;
      const indexToken = marketInfo.indexToken;

      if (marketInfo.isDisabled || !longToken || !shortToken || !indexToken) {
        continue;
      }

      if ((longToken.isWrapped || shortToken.isWrapped) && nativeToken) {
        collaterals.add(nativeToken);
      }

      collaterals.add(longToken);
      collaterals.add(shortToken);

      const longPoolAmountUsd = convertToUsd(
        marketInfo.longPoolAmount,
        marketInfo.longToken.decimals,
        getMidPrice(marketInfo.longToken.prices)
      )!;

      const shortPoolAmountUsd = convertToUsd(
        marketInfo.shortPoolAmount,
        marketInfo.shortToken.decimals,
        getMidPrice(marketInfo.shortToken.prices)
      )!;

      longTokensWithPoolValue[longToken.address] =
        (longTokensWithPoolValue[longToken.address] ?? 0n) + longPoolAmountUsd;

      shortTokensWithPoolValue[shortToken.address] =
        (shortTokensWithPoolValue[shortToken.address] ?? 0n) + shortPoolAmountUsd;

      if (!marketInfo.isSpotOnly) {
        indexTokens.add(indexToken);
        allMarkets.add(marketInfo);
        indexTokensWithPoolValue[indexToken.address] =
          (indexTokensWithPoolValue[indexToken.address] ?? 0n) + marketInfo.poolValueMax;
      }
    }

    const sortedIndexTokensWithPoolValue = Object.keys(indexTokensWithPoolValue).sort((a, b) => {
      return indexTokensWithPoolValue[b] > indexTokensWithPoolValue[a] ? 1 : -1;
    });

    const sortedAllMarkets = Array.from(allMarkets).sort((a, b) => {
      return (
        sortedIndexTokensWithPoolValue.indexOf(a.indexToken.address) -
        sortedIndexTokensWithPoolValue.indexOf(b.indexToken.address)
      );
    });

    if (sortedAllMarkets.length >= SORTED_MARKETS.length) {
      localStorage.setItem(
        SORTED_MARKETS_KEY,
        JSON.stringify(sortedAllMarkets.map((market) => market.marketTokenAddress))
      );
    }

    const sortedMarketAddresses = getCachedSortedMarketAddresses();
    const sortedMarketConfigs = sortedMarketAddresses
      .map((address) => marketsData?.[address])
      .filter(Boolean) as Market[];

    const sortedLongTokens = Object.keys(longTokensWithPoolValue).sort((a, b) => {
      return longTokensWithPoolValue[b] > longTokensWithPoolValue[a] ? 1 : -1;
    });

    const sortedShortTokens = Object.keys(shortTokensWithPoolValue).sort((a, b) => {
      return shortTokensWithPoolValue[b] > shortTokensWithPoolValue[a] ? 1 : -1;
    });

    const sortedLongAndShortTokens = sortedLongTokens.concat(sortedShortTokens);

    return {
      tokensMap,
      swapTokens: Array.from(collaterals),
      indexTokens: Array.from(indexTokens),
      infoTokens: {
        ...adaptToV1InfoTokens(tokensData || {}),
        ...adaptToV1InfoTokens(marketTokens || {}),
      },
      sortedIndexTokensWithPoolValue,
      sortedLongAndShortTokens: Array.from(new Set(sortedLongAndShortTokens)),
      sortedAllMarkets,
      sortedMarketConfigs,
    };
  }, [marketsInfoData, marketsData, chainId, tokensData, marketTokens]);
}
