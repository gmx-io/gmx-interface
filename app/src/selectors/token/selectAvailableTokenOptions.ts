import { BN_ZERO } from '@/config/constants';
import { selectGlvsAndMarketsInfo } from '@/selectors/glv/selectGlvsAndMarketsInfo';
import { MarketInfo } from '@/selectors/market/types';
import { selectNativeToken } from '@/selectors/token/selectNativeToken';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { AvailableTokenOptions, TokenData } from '@/selectors/token/types';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import { isMarketInfo } from '@/utils/market/isMarketInfo';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketTokensData } from './selectMarketTokensData';

import { BN } from '@coral-xyz/anchor';

export const selectAvailableTokenOptions = createAppStoreSelector(
  [
    selectGlvsAndMarketsInfo,
    selectTokensData,
    selectMarketTokensData,
    selectNativeToken,
  ],
  (
    marketsInfoData,
    tokensData,
    marketTokensData,
    nativeToken
  ): AvailableTokenOptions => {
    const marketsInfo = Object.values(marketsInfoData || {})
      .filter((market) => !market.isDisabled)
      .sort((a, b) => {
        const tokenA = isGlvInfo(a) ? a.glvToken : a.indexToken;
        const tokenB = isGlvInfo(b) ? b.glvToken : b.indexToken;
        return tokenA?.symbol.localeCompare(tokenB?.symbol);
      });

    const allMarkets = new Set<MarketInfo>();
    const indexTokens = new Set<TokenData>();
    const indexTokensWithPoolValue: { [address: string]: BN } = {};
    const collaterals = new Set<TokenData>();

    const longTokensWithPoolValue: { [address: string]: BN } = {};
    const shortTokensWithPoolValue: { [address: string]: BN } = {};

    if (nativeToken) {
      collaterals.add(nativeToken);
    }

    for (const key in tokensData) {
      const token = tokensData[key];
      // Also include wrapped tokens.
      if (token.shouldWrap && token.wrappedAddress) {
        collaterals.add(token);
      }
    }

    for (const marketInfo of marketsInfo) {
      if (isGlvInfo(marketInfo)) {
        if (marketInfo.isDisabled) {
          continue;
        }

        marketInfo.markets.forEach((market) => {
          const gmMarket =
            marketsInfoData?.[market.marketTokenAddress.toBase58()];

          if (!gmMarket || !isMarketInfo(gmMarket)) {
            return;
          }

          const gmToken = tokensData?.[gmMarket.marketTokenAddress.toBase58()];

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

      collaterals.add(longToken);
      collaterals.add(shortToken);

      const longPoolAmountUsd = convertTokenAmountToUsd(
        marketInfo.primaryLongTokenAmount,
        longToken.decimals,
        getMarketMidPrice(longToken.prices)
      );

      const shortPoolAmountUsd = convertTokenAmountToUsd(
        marketInfo.primaryShortTokenAmount,
        shortToken.decimals,
        getMarketMidPrice(shortToken.prices)
      );

      longTokensWithPoolValue[longToken.address.toBase58()] = (
        longTokensWithPoolValue[longToken.address.toBase58()] ?? BN_ZERO
      ).add(longPoolAmountUsd);

      shortTokensWithPoolValue[shortToken.address.toBase58()] = (
        shortTokensWithPoolValue[shortToken.address.toBase58()] ?? BN_ZERO
      ).add(shortPoolAmountUsd);

      if (!marketInfo.isSpotOnly) {
        indexTokens.add(indexToken);
        allMarkets.add(marketInfo);
        indexTokensWithPoolValue[indexToken.address.toBase58()] = (
          indexTokensWithPoolValue[indexToken.address.toBase58()] ?? BN_ZERO
        ).add(marketInfo.poolValueMax);
      }
    }

    const sortedIndexTokensWithPoolValue = Object.keys(
      indexTokensWithPoolValue
    ).sort((a, b) => {
      return indexTokensWithPoolValue[b].gt(indexTokensWithPoolValue[a])
        ? 1
        : -1;
    });

    const sortedAllMarkets = Array.from(allMarkets).sort((a, b) => {
      return (
        sortedIndexTokensWithPoolValue.indexOf(
          a.indexToken.address.toBase58()
        ) -
        sortedIndexTokensWithPoolValue.indexOf(b.indexToken.address.toBase58())
      );
    });

    const sortedLongTokens = Object.keys(longTokensWithPoolValue).sort(
      (a, b) => {
        return longTokensWithPoolValue[b].gt(longTokensWithPoolValue[a])
          ? 1
          : -1;
      }
    );

    const sortedShortTokens = Object.keys(shortTokensWithPoolValue).sort(
      (a, b) => {
        return shortTokensWithPoolValue[b].gt(shortTokensWithPoolValue[a])
          ? 1
          : -1;
      }
    );

    const sortedLongAndShortTokens = sortedLongTokens.concat(sortedShortTokens);

    return {
      tokens: tokensData,
      swapTokens: Array.from(collaterals),
      indexTokens: Array.from(indexTokens),
      infoTokens: {
        ...(tokensData || {}),
        ...(marketTokensData || {}),
      },
      sortedIndexTokensWithPoolValue,
      sortedLongAndShortTokens: Array.from(new Set(sortedLongAndShortTokens)),
      sortedAllMarkets,
    };
  }
);
