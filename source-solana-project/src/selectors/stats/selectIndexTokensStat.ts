import {
  BN_ZERO,
  CHART_PERIODS,
  MIN_SIGNED_USD,
  ONE_USD,
} from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectAvailableTokenOptions } from '../token/selectAvailableTokenOptions';
import { selectMarketTokensStat } from './selectMarketTokensStat';
import { IndexTokensStat, IndexTokenStat, MarketTokenStat } from './types';

function maxByBN<T>(array: T[], iteratee: (item: T) => BN): T | undefined {
  if (!array.length) return undefined;

  return array.reduce((max, current) => {
    const currentValue = iteratee(current);
    const maxValue = iteratee(max);

    return currentValue.gt(maxValue) ? current : max;
  });
}

type MarketWithLiquidity = {
  maxLongLiquidity: BN;
  maxShortLiquidity: BN;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

export const selectIndexTokensStat = createAppStoreSelector(
  [selectMarketsInfo, selectMarketTokensStat, selectAvailableTokenOptions],
  (marketsInfo, marketsStat, availableTokensOptions): IndexTokensStat => {
    const indexTokensStat: IndexTokensStat = {};

    const sortedAllMarkets = availableTokensOptions.sortedAllMarkets;
    const marketsWithMaxReservedUsd: MarketWithLiquidity[] =
      sortedAllMarkets.map((marketInfo) => ({
        maxLongLiquidity: getMarketAvailableLiquidityUsdForPosition(
          marketInfo,
          true
        ),
        maxShortLiquidity: getMarketAvailableLiquidityUsdForPosition(
          marketInfo,
          false
        ),
        marketTokenAddress: marketInfo.marketTokenAddress.toBase58(),
        indexTokenAddress: marketInfo.indexTokenAddress.toBase58(),
      }));

    const groupedIndexMarkets: Record<string, MarketWithLiquidity[]> = {};
    for (const market of marketsWithMaxReservedUsd) {
      const key = market.indexTokenAddress;
      if (!groupedIndexMarkets[key]) {
        groupedIndexMarkets[key] = [];
      }
      groupedIndexMarkets[key].push(market);
    }

    for (const [marketTokenAddress, marketStat] of Object.entries(
      marketsStat
    )) {
      const marketInfo = marketsInfo[marketTokenAddress];
      if (!marketInfo) continue;

      const indexKey = marketInfo.indexTokenAddress.toBase58();
      const indexStat =
        indexTokensStat[indexKey] ?? createInitialIndexStat(marketInfo);

      const markets = groupedIndexMarkets[indexKey] || [];
      const maxLongLiquidityPool = maxByBN(
        markets,
        (market) => market.maxLongLiquidity
      );
      const maxShortLiquidityPool = maxByBN(
        markets,
        (market) => market.maxShortLiquidity
      );

      if (maxLongLiquidityPool && maxShortLiquidityPool) {
        indexStat.maxLongLiquidityPool = {
          maxLongLiquidity: maxLongLiquidityPool.maxLongLiquidity,
          maxShortLiquidity: maxLongLiquidityPool.maxShortLiquidity,
          marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
          indexTokenAddress: maxLongLiquidityPool.indexTokenAddress,
        };
        indexStat.maxShortLiquidityPool = {
          maxLongLiquidity: maxShortLiquidityPool.maxLongLiquidity,
          maxShortLiquidity: maxShortLiquidityPool.maxShortLiquidity,
          marketTokenAddress: maxShortLiquidityPool.marketTokenAddress,
          indexTokenAddress: maxShortLiquidityPool.indexTokenAddress,
        };
      }

      const hourlyLongNetRate = marketStat.longNetRatePerSecond.muln(
        CHART_PERIODS['1h']
      );
      const hourlyShortNetRate = marketStat.shortNetRatePerSecond.muln(
        CHART_PERIODS['1h']
      );

      if (hourlyLongNetRate.gt(indexStat.bestNetFeeLong)) {
        indexStat.bestNetFeeLong = hourlyLongNetRate;
        indexStat.bestNetFeeLongMarketAddress = marketTokenAddress;
      }

      if (hourlyShortNetRate.gt(indexStat.bestNetFeeShort)) {
        indexStat.bestNetFeeShort = hourlyShortNetRate;
        indexStat.bestNetFeeShortMarketAddress = marketTokenAddress;
      }

      indexTokensStat[indexKey] = updateIndexStat(indexStat, marketStat);
    }

    // Check gtEnabled status for all markets under each index token
    for (const [indexTokenAddress, indexStat] of Object.entries(
      indexTokensStat
    )) {
      const marketsForIndex = Object.values(marketsInfo).filter(
        (market) =>
          !market.isSpotOnly &&
          !market.isDisabled &&
          market.indexTokenAddress.toBase58() === indexTokenAddress
      );

      // Set gtEnabledForIndexToken to true only if all markets have GtEnabled true
      indexStat.gtEnabledForIndexToken =
        marketsForIndex.length > 0 &&
        marketsForIndex.every((market) => market.GtEnabled);
    }

    return indexTokensStat;
  }
);

function createInitialIndexStat(marketInfo: MarketInfo): IndexTokenStat {
  return {
    token: marketInfo.indexToken,
    price: marketInfo.indexToken.prices.minPrice,
    totalPoolValue: BN_ZERO,
    totalUtilization: BN_ZERO,
    totalUsedLiquidity: BN_ZERO,
    totalMaxLiquidity: BN_ZERO,
    bestNetFeeLong: MIN_SIGNED_USD,
    bestNetFeeShort: MIN_SIGNED_USD,
    bestNetFeeLongMarketAddress: marketInfo.marketTokenAddress.toBase58(),
    bestNetFeeShortMarketAddress: marketInfo.marketTokenAddress.toBase58(),
    maxLongLiquidityPool: {
      maxLongLiquidity: BN_ZERO,
      maxShortLiquidity: BN_ZERO,
      marketTokenAddress: '',
      indexTokenAddress: marketInfo.indexTokenAddress.toBase58(),
    },
    maxShortLiquidityPool: {
      maxLongLiquidity: BN_ZERO,
      maxShortLiquidity: BN_ZERO,
      marketTokenAddress: '',
      indexTokenAddress: marketInfo.indexTokenAddress.toBase58(),
    },
    marketTokensStat: [],
    gtEnabledForIndexToken: true,
  };
}

function updateIndexStat(
  indexStat: IndexTokenStat,
  marketStat: MarketTokenStat
): IndexTokenStat {
  const updatedStat = { ...indexStat };
  const poolValueUsd =
    marketStat.marketInfo.poolValueWithoutPnlForLong?.add(
      marketStat.marketInfo.poolValueWithoutPnlForShort ?? BN_ZERO
    ) ?? BN_ZERO;

  updatedStat.totalPoolValue = updatedStat.totalPoolValue.add(poolValueUsd);
  updatedStat.totalUsedLiquidity = updatedStat.totalUsedLiquidity.add(
    marketStat.marketUsedLiquidity
  );
  updatedStat.totalMaxLiquidity = updatedStat.totalMaxLiquidity.add(
    marketStat.marketMaxLiquidity
  );
  updatedStat.totalUtilization = !updatedStat.totalPoolValue.isZero()
    ? updatedStat.totalUsedLiquidity
        .mul(ONE_USD)
        .div(updatedStat.totalPoolValue)
    : BN_ZERO;
  updatedStat.bestNetFeeLong = BN.max(
    updatedStat.bestNetFeeLong,
    marketStat.longNetRatePerSecond.muln(CHART_PERIODS['1h'])
  );
  updatedStat.bestNetFeeShort = BN.max(
    updatedStat.bestNetFeeShort,
    marketStat.shortNetRatePerSecond.muln(CHART_PERIODS['1h'])
  );
  updatedStat.marketTokensStat.push(marketStat);
  updatedStat.marketTokensStat.sort((a, b) =>
    b.poolValueUsd.cmp(a.poolValueUsd)
  );

  return updatedStat;
}
