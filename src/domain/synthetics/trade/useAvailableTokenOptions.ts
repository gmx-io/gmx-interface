import { useEffect, useMemo, useRef } from "react";
import { zeroAddress } from "viem";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, MEGAETH } from "config/chains";
import { getSortedMarketsAddressesKey } from "config/localStorage";
import { SORTED_MARKETS } from "config/static/sortedMarkets";
import { GlvAndGmMarketsInfoData, Market, MarketInfo, MarketsData, isMarketInfo } from "domain/synthetics/markets";
import { InfoTokens, Token, getMidPrice } from "domain/tokens";
import { getByKey } from "lib/objects";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { NATIVE_TOKEN_ADDRESS, getTokensMap } from "sdk/configs/tokens";

import { isGlvInfo } from "../markets/glv";
import { TokenData, TokensData, adaptToV1InfoTokens, convertToUsd } from "../tokens";

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

function getCachedSortedMarketAddresses(chainId: number): string[] {
  const cached = localStorage.getItem(getSortedMarketsAddressesKey(chainId));

  if (cached) {
    return JSON.parse(cached);
  }

  return SORTED_MARKETS[chainId];
}

function saveCachedSortedMarketAddresses(chainId: number, sortedMarketsInfo: MarketInfo[]) {
  const addresses = sortedMarketsInfo.map((marketInfo) => marketInfo.marketTokenAddress);

  localStorage.setItem(getSortedMarketsAddressesKey(chainId), JSON.stringify(addresses));

  return addresses;
}

// Temporary solution until positions sorting implementation is updated
function getSortedMarketsConfigs(marketsData?: MarketsData, sortedAddresses?: string[]) {
  if (!marketsData || !sortedAddresses) {
    return [];
  }

  let resultSortedAddresses = sortedAddresses;
  const marketsAddresses = Object.keys(marketsData);

  // If markets are not presented in cache, add them to the end
  if (marketsAddresses.length > sortedAddresses.length) {
    const newMarketsAddresses = marketsAddresses.filter((address) => !sortedAddresses.includes(address));
    resultSortedAddresses = sortedAddresses.concat(newMarketsAddresses);
  }

  return resultSortedAddresses.map((address) => getByKey(marketsData, address)).filter(Boolean) as Market[];
}

const FORCE_ALLOWED_COLLATERAL_TOKENS: Record<ContractsChainId, string[]> = {
  // handled by wrapOrUnwrap or by stakeOrUnstake
  [BOTANIX]: [
    // bBTC
    zeroAddress,
    // pBTC
    "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56",
  ],
  [MEGAETH]: [
    // ETH - handled by wrapOrUnwrap
    zeroAddress,
    // WETH
    "0x4200000000000000000000000000000000000006",
  ],
  [AVALANCHE]: [],
  [ARBITRUM]: [],
  [AVALANCHE_FUJI]: [],
  [ARBITRUM_SEPOLIA]: [],
};

export function useAvailableTokenOptions(
  chainId: number,
  p: {
    marketsInfoData?: GlvAndGmMarketsInfoData;
    marketsData?: MarketsData;
    tokensData?: TokensData;
    marketTokens?: TokensData;
    srcChainId: SourceChainId | undefined;
  }
): AvailableTokenOptions {
  const { marketsInfoData, marketsData, tokensData, marketTokens, srcChainId } = p;

  const sortedMarketAddressesRef = useRef<string[]>();

  useEffect(
    function updateSortedMarketAddresses() {
      sortedMarketAddressesRef.current = getCachedSortedMarketAddresses(chainId);
    },
    [chainId]
  );

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

      if ((longToken.isWrapped || shortToken.isWrapped) && nativeToken && !srcChainId) {
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

    if (sortedAllMarkets.length) {
      sortedMarketAddressesRef.current = saveCachedSortedMarketAddresses(chainId, sortedAllMarkets);
    }

    const sortedMarketConfigs = getSortedMarketsConfigs(marketsData, sortedMarketAddressesRef.current);

    const sortedLongTokens = Object.keys(longTokensWithPoolValue).sort((a, b) => {
      return longTokensWithPoolValue[b] > longTokensWithPoolValue[a] ? 1 : -1;
    });

    const sortedShortTokens = Object.keys(shortTokensWithPoolValue).sort((a, b) => {
      return shortTokensWithPoolValue[b] > shortTokensWithPoolValue[a] ? 1 : -1;
    });

    const sortedLongAndShortTokens = sortedLongTokens.concat(sortedShortTokens);

    const collateralAddresses = new Set(Array.from(collaterals).map((c) => c.address));

    FORCE_ALLOWED_COLLATERAL_TOKENS[chainId].forEach((tokenAddress) => {
      if (!collateralAddresses.has(tokenAddress)) {
        collateralAddresses.add(tokenAddress);
        const tokenData = tokensData?.[tokenAddress];

        if (tokenData) {
          collaterals.add(tokenData);
        }
      }
    });

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
  }, [marketsInfoData, chainId, tokensData, marketsData, marketTokens, srcChainId]);
}
