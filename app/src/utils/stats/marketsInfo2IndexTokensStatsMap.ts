import {
  BN_ZERO,
  CHART_PERIODS,
  MIN_SIGNED_USD,
  ONE_USD,
} from '@/config/constants';
import { MarketsInfo } from '@/selectors/market/types';
import { IndexTokenStat } from '@/selectors/stats/types';
import { getMarketAvailableLiquidityUsd } from '@/utils/market/getMarketAvailableLiquidityUsd';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { getMarketFundingRatePerSecond } from '@/utils/market/getMarketFundingRatePerSecond';
import { getMarketOpenInterestPercentage } from '@/utils/market/getMarketOpenInterestPercentage';
import { BN } from '@coral-xyz/anchor';

// Add maxByBN helper function
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

export function marketsInfo2IndexTokensStatsMap(marketsInfo: MarketsInfo): {
  indexMap: Partial<Record<string, IndexTokenStat>>;
  sortedByTotalPoolValue: string[];
} {
  const markets = Object.values(marketsInfo || {}).sort((a, b) => {
    return a.indexToken.symbol.localeCompare(b.indexToken.symbol);
  });

  const indexMap: Partial<Record<string, IndexTokenStat>> = {};

  const marketsWithMaxReservedUsd: MarketWithLiquidity[] = markets
    .filter((market) => !market.isSpotOnly && !market.isDisabled)
    .map((marketInfo) => ({
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

  // Replace groupBy with manual grouping
  const groupedIndexMarkets: Record<string, MarketWithLiquidity[]> = {};
  for (const market of marketsWithMaxReservedUsd) {
    const key = market.indexTokenAddress;
    if (!groupedIndexMarkets[key]) {
      groupedIndexMarkets[key] = [];
    }
    groupedIndexMarkets[key].push(market);
  }

  for (const marketInfo of markets) {
    if (marketInfo.isSpotOnly || marketInfo.isDisabled) {
      continue;
    }

    const indexTokenAddress = marketInfo.indexTokenAddress.toBase58();
    const marketTokenAddress = marketInfo.marketTokenAddress.toBase58();

    if (!indexMap[indexTokenAddress]) {
      indexMap[indexTokenAddress] = {
        token: marketInfo.indexToken,
        price: marketInfo.indexToken.prices.minPrice,
        totalPoolValue: BN_ZERO,
        totalUtilization: BN_ZERO,
        totalUsedLiquidity: BN_ZERO,
        totalMaxLiquidity: BN_ZERO,
        bestNetFeeLong: MIN_SIGNED_USD,
        bestNetFeeShort: MIN_SIGNED_USD,
        bestNetFeeLongMarketAddress: marketTokenAddress,
        bestNetFeeShortMarketAddress: marketTokenAddress,
        maxLongLiquidityPool: {
          maxLongLiquidity: BN_ZERO,
          maxShortLiquidity: BN_ZERO,
          marketTokenAddress: '',
          indexTokenAddress: indexTokenAddress,
        },
        maxShortLiquidityPool: {
          maxLongLiquidity: BN_ZERO,
          maxShortLiquidity: BN_ZERO,
          marketTokenAddress: '',
          indexTokenAddress: indexTokenAddress,
        },
        marketTokensStat: [],
        gtEnabledForIndexToken: false,
      };

      // Handle max liquidity pools
      const markets = groupedIndexMarkets[indexTokenAddress] || [];
      const maxLongLiquidityPool = maxByBN(
        markets,
        (market) => market.maxLongLiquidity
      );
      const maxShortLiquidityPool = maxByBN(
        markets,
        (market) => market.maxShortLiquidity
      );

      if (maxLongLiquidityPool && maxShortLiquidityPool) {
        indexMap[indexTokenAddress].maxLongLiquidityPool = {
          maxLongLiquidity: maxLongLiquidityPool.maxLongLiquidity,
          maxShortLiquidity: maxLongLiquidityPool.maxShortLiquidity,
          marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
          indexTokenAddress: maxLongLiquidityPool.indexTokenAddress,
        };
        indexMap[indexTokenAddress].maxShortLiquidityPool = {
          maxLongLiquidity: maxShortLiquidityPool.maxLongLiquidity,
          maxShortLiquidity: maxShortLiquidityPool.maxShortLiquidity,
          marketTokenAddress: maxShortLiquidityPool.marketTokenAddress,
          indexTokenAddress: maxShortLiquidityPool.indexTokenAddress,
        };
      }
    }

    const indexTokenStats = indexMap[indexTokenAddress];

    const longMarketOpenInterest =
      marketInfo.openInterestForLongLongTokenAmount.add(
        marketInfo.openInterestForLongShortTokenAmount
      );
    const shortMarketOpenInterest =
      marketInfo.openInterestForShortLongTokenAmount.add(
        marketInfo.openInterestForShortShortTokenAmount
      );
    const totalMarketOpenInterest = longMarketOpenInterest.add(
      shortMarketOpenInterest
    );

    const longMarketOpenInterestPercentage = getMarketOpenInterestPercentage(
      longMarketOpenInterest,
      totalMarketOpenInterest
    );
    const shortMarketOpenInterestPercentage = getMarketOpenInterestPercentage(
      shortMarketOpenInterest,
      totalMarketOpenInterest
    );

    const longPendingPnl = marketInfo.pendingPnlForLong ?? BN_ZERO;
    const shortPendingPnl = marketInfo.pendingPnlForShort ?? BN_ZERO;

    const { longMarketAvailableLiquidity, shortMarketAvailableLiquidity } =
      getMarketAvailableLiquidityUsd(marketInfo);

    const marketUsedLiquidity = longMarketOpenInterest.add(
      shortMarketOpenInterest
    );
    const marketMaxLiquidity = longMarketAvailableLiquidity.add(
      shortMarketAvailableLiquidity
    );
    const poolValueUsd = marketInfo.poolValueMax;

    const poolUtilization = poolValueUsd.isZero()
      ? BN_ZERO
      : marketUsedLiquidity.mul(ONE_USD).div(poolValueUsd);

    const longBorrowingRatePerSecond =
      marketInfo.borrowingFactorPerSecondForLong?.neg() ?? BN_ZERO;
    const shortBorrowingRatePerSecond =
      marketInfo.borrowingFactorPerSecondForShort?.neg() ?? BN_ZERO;

    const { longFundingRatePerSecond, shortFundingRatePerSecond } =
      getMarketFundingRatePerSecond(
        longMarketOpenInterest,
        shortMarketOpenInterest,
        marketInfo.fundingFactorPerSecond
      );

    const longNetRatePerSecond = longBorrowingRatePerSecond.add(
      longFundingRatePerSecond
    );
    const shortNetRatePerSecond = shortBorrowingRatePerSecond.add(
      shortFundingRatePerSecond
    );

    const hourlyLongNetRate = longNetRatePerSecond.muln(CHART_PERIODS['1h']);
    const hourlyShortNetRate = shortNetRatePerSecond.muln(CHART_PERIODS['1h']);

    indexTokenStats.totalPoolValue =
      indexTokenStats.totalPoolValue.add(poolValueUsd);
    indexTokenStats.totalUsedLiquidity =
      indexTokenStats.totalUsedLiquidity.add(marketUsedLiquidity);
    indexTokenStats.totalMaxLiquidity =
      indexTokenStats.totalMaxLiquidity.add(marketMaxLiquidity);

    if (hourlyLongNetRate.gt(indexTokenStats.bestNetFeeLong)) {
      indexTokenStats.bestNetFeeLong = hourlyLongNetRate;
      indexTokenStats.bestNetFeeLongMarketAddress = marketTokenAddress;
    }

    if (hourlyShortNetRate.gt(indexTokenStats.bestNetFeeShort)) {
      indexTokenStats.bestNetFeeShort = hourlyShortNetRate;
      indexTokenStats.bestNetFeeShortMarketAddress = marketTokenAddress;
    }

    indexTokenStats.marketTokensStat.push({
      marketInfo,
      longMarketOpenInterest,
      shortMarketOpenInterest,
      totalMarketOpenInterest,
      longMarketOpenInterestPercentage,
      shortMarketOpenInterestPercentage,
      longBorrowingRatePerSecond,
      shortBorrowingRatePerSecond,
      longFundingRatePerSecond,
      shortFundingRatePerSecond,
      longNetRatePerSecond,
      shortNetRatePerSecond,
      longPendingPnl,
      shortPendingPnl,
      marketUsedLiquidity,
      longMarketAvailableLiquidity,
      shortMarketAvailableLiquidity,
      marketMaxLiquidity,
      poolValueUsd,
      poolUtilization,
    });
  }

  // Calculate total utilization and sort market stats
  for (const indexTokenStats of Object.values(indexMap)) {
    if (!indexTokenStats) continue;

    indexTokenStats.totalUtilization = !indexTokenStats.totalPoolValue.isZero()
      ? indexTokenStats.totalUsedLiquidity
          .mul(ONE_USD)
          .div(indexTokenStats.totalPoolValue)
      : BN_ZERO;

    indexTokenStats.marketTokensStat.sort((a, b) =>
      b.poolValueUsd.cmp(a.poolValueUsd)
    );
  }

  const sortedByTotalPoolValue = Object.keys(indexMap).sort((a, b) => {
    const statsA = indexMap[a];
    const statsB = indexMap[b];
    if (!statsA || !statsB) return 0;
    return statsB.totalPoolValue.cmp(statsA.totalPoolValue);
  });

  return {
    indexMap,
    sortedByTotalPoolValue,
  };
}
