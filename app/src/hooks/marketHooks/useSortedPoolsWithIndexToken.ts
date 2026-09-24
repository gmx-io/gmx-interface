import { BN_ZERO } from '@/config/constants';
import {
  GlvAndGmMarketsInfo,
  GlvInfoDataForSorted,
  GlvOrMarketInfo,
} from '@/selectors/glv/types';
import { MarketsInfo } from '@/selectors/market/types';
import { TokenData, TokensData } from '@/selectors/token/types';
import { getGlvOrMarketAddress } from '@/utils/glv/getGlvOrMarketAddress';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getByKey } from '@/utils/lib/object';
import { toBN } from 'gmsol';
import groupBy from 'lodash/groupBy';
import { useMemo } from 'react';

const DEFAULT_VALUE = {
  markets: [],
  marketsInfo: [],
};

export function sortMarketsWithIndexToken<
  T extends GlvAndGmMarketsInfo | MarketsInfo | GlvInfoDataForSorted,
>(
  marketsInfoData: T | undefined,
  marketTokensData: TokensData | undefined
): {
  markets: TokenData[];
  marketsInfo: T[keyof T][];
} {
  if (!marketsInfoData || !marketTokensData) {
    return DEFAULT_VALUE;
  }

  // Group markets by index token address
  // const groupedMarketList: { [marketAddress: string]: GlvOrMarketInfo[] } = groupBy(
  //   Object.values(marketsInfoData),
  //   (market) => market[market.isSpotOnly ? "marketTokenAddress" : "indexTokenAddress"]
  // );

  // Group markets by index token address
  const groupedMarketList: { [marketAddress: string]: GlvOrMarketInfo[] } =
    groupBy(Object.values(marketsInfoData), (market) => {
      if (isGlvInfo(market)) {
        // GLV markets should use the first market's token address
        return (
          market.markets[0]?.marketTokenAddress.toBase58() ||
          market.glvTokenAddress.toBase58()
        );
      }
      // For regular markets, use existing logic
      return market.isSpotOnly
        ? market.marketTokenAddress.toBase58()
        : market.indexTokenAddress.toBase58();
    });

  const allMarkets = Object.values(groupedMarketList)
    .map((markets) => {
      return markets
        .filter((market) => {
          const marketInfoData = getByKey(
            marketsInfoData,
            getGlvOrMarketAddress(market)
          )!;
          return !marketInfoData.isDisabled;
        })
        .map((market) => ({
          isGlv: isGlvInfo(market),
          token: getByKey(marketTokensData, getGlvOrMarketAddress(market)),
        }))
        .filter(
          (market): market is { isGlv: boolean; token: TokenData } =>
            market.token !== undefined
        );
    })
    .filter((markets) => markets.length > 0);

  const sortedGroups = allMarkets.sort((a, b) => {
    // GLV markets first
    if (a[0].isGlv && !b[0].isGlv) {
      return -1;
    }
    if (!a[0].isGlv && b[0].isGlv) {
      return 1;
    }

    const totalMarketSupplyA = a.reduce((acc, { token: market }) => {
      const totalSupplyUsd = convertTokenAmountToUsd(
        market?.totalSupply,
        market?.decimals,
        market?.prices.minPrice
      );
      acc = acc.add(totalSupplyUsd || BN_ZERO);
      return acc;
    }, toBN(0));

    const totalMarketSupplyB = b.reduce((acc, { token: market }) => {
      const totalSupplyUsd = convertTokenAmountToUsd(
        market?.totalSupply,
        market?.decimals,
        market?.prices.minPrice
      );
      acc = acc.add(totalSupplyUsd || BN_ZERO);
      return acc;
    }, toBN(0));

    return totalMarketSupplyA.gt(totalMarketSupplyB) ? -1 : 1;
  });

  // Sort markets within each group by total supply
  const sortedMarkets = sortedGroups.map((markets) => {
    return markets
      .sort(({ token: a }, { token: b }) => {
        const totalSupplyUsdA = convertTokenAmountToUsd(
          a.totalSupply,
          a.decimals,
          a.prices.minPrice
        );
        const totalSupplyUsdB = convertTokenAmountToUsd(
          b.totalSupply,
          b.decimals,
          b.prices.minPrice
        );
        return totalSupplyUsdA.gt(totalSupplyUsdB) ? -1 : 1;
      })
      .map((e) => e.token);
  });

  // Flatten the sorted markets array
  const flattenedMarkets = sortedMarkets
    .flat(Infinity)
    .filter(Boolean) as TokenData[];
  return {
    markets: flattenedMarkets,
    marketsInfo: flattenedMarkets.map(
      (market) =>
        getByKey(marketsInfoData, market.address.toBase58()) as T[keyof T]
    ),
  };
}

export function useSortedPoolsWithIndexToken(
  marketsInfoData?: GlvAndGmMarketsInfo,
  marketTokensData?: TokensData
) {
  return useMemo(() => {
    return sortMarketsWithIndexToken(marketsInfoData, marketTokensData);
  }, [marketsInfoData, marketTokensData]);
}
