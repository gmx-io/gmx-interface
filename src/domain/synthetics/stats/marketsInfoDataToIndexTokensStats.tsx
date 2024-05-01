import { BigNumber, constants } from "ethers";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import { getUsedLiquidity, MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { getMidPrice, TokenData } from "domain/synthetics/tokens";
import { CHART_PERIODS } from "lib/legacy";
import { BN_ZERO } from "lib/numbers";

export type MarketStat = {
  marketInfo: MarketInfo;
  poolValueUsd: bigint;
  usedLiquidity: bigint;
  maxLiquidity: bigint;
  netFeeLong: bigint;
  netFeeShort: bigint;
  utilization: bigint;
};

export type IndexTokenStat = {
  token: TokenData;
  price: bigint;
  totalPoolValue: bigint;
  totalUtilization: bigint;
  totalUsedLiquidity: bigint;
  totalMaxLiquidity: bigint;
  bestNetFeeLong: bigint;
  bestNetFeeShort: bigint;
  /**
   * Sorted by poolValueUsd descending
   */
  marketsStats: MarketStat[];
  bestNetFeeLongMarketAddress: string;
  bestNetFeeShortMarketAddress: string;
};

export type IndexTokensStats = {
  [address: string]: IndexTokenStat;
};

export function bnMax(...args: BigNumber[]): BigNumber {
  let max = args[0];
  for (let i = 1; i < args.length; i++) {
    if (args[i].gt(max)) {
      max = args[i];
    }
  }

  return max;
}

export function marketsInfoData2IndexTokenStatsMap(marketsInfoData: MarketsInfoData): {
  indexMap: Partial<Record<string, IndexTokenStat>>;
  sortedByTotalPoolValue: string[];
} {
  const markets = Object.values(marketsInfoData || {}).sort((a, b) => {
    return a.indexToken.symbol.localeCompare(b.indexToken.symbol);
  });

  const indexMap: IndexTokensStats = {};

  for (const marketInfo of markets) {
    if (marketInfo.isSpotOnly || marketInfo.isDisabled) {
      continue;
    }

    if (!indexMap[marketInfo.indexTokenAddress]) {
      const indexToken = marketInfo.indexToken;
      const price = getMidPrice(indexToken.prices)!;

      indexMap[marketInfo.indexTokenAddress] = {
        token: indexToken,
        price,
        totalPoolValue: BN_ZERO,
        totalUtilization: BN_ZERO,
        totalUsedLiquidity: BN_ZERO,
        totalMaxLiquidity: BN_ZERO,
        marketsStats: [],
        bestNetFeeLong: constants.MinInt256,
        bestNetFeeShort: constants.MinInt256,
        bestNetFeeLongMarketAddress: marketInfo.marketTokenAddress,
        bestNetFeeShortMarketAddress: marketInfo.marketTokenAddress,
      };
    }

    const indexTokenStats = indexMap[marketInfo.indexTokenAddress];

    const poolValueUsd = marketInfo.poolValueMax;

    const fundingRateLong = getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
    const fundingRateShort = getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);
    const borrowingRateLong = getBorrowingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]).mul(-1);
    const borrowingRateShort = getBorrowingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]).mul(-1);

    const [longUsedLiquidity, longMaxLiquidity] = getUsedLiquidity(marketInfo, true);

    const [shortUsedLiquidity, shortMaxLiquidity] = getUsedLiquidity(marketInfo, false);

    const usedLiquidity = longUsedLiquidity.add(shortUsedLiquidity);
    const maxLiquidity = longMaxLiquidity.add(shortMaxLiquidity);

    const utilization = maxLiquidity.gt(0) ? usedLiquidity.mul(BASIS_POINTS_DIVISOR).div(maxLiquidity) : 0n;

    const netFeeLong = borrowingRateLong.add(fundingRateLong);
    const netFeeShort = borrowingRateShort.add(fundingRateShort);

    indexTokenStats.totalPoolValue = indexTokenStats.totalPoolValue.add(poolValueUsd);
    indexTokenStats.totalUsedLiquidity = indexTokenStats.totalUsedLiquidity.add(usedLiquidity);
    indexTokenStats.totalMaxLiquidity = indexTokenStats.totalMaxLiquidity.add(maxLiquidity);
    if (netFeeLong.gt(indexTokenStats.bestNetFeeLong)) {
      indexTokenStats.bestNetFeeLong = netFeeLong;
      indexTokenStats.bestNetFeeLongMarketAddress = marketInfo.marketTokenAddress;
    }
    if (netFeeShort.gt(indexTokenStats.bestNetFeeShort)) {
      indexTokenStats.bestNetFeeShort = netFeeShort;
      indexTokenStats.bestNetFeeShortMarketAddress = marketInfo.marketTokenAddress;
    }
    indexTokenStats.marketsStats.push({
      marketInfo,
      utilization,
      netFeeLong,
      netFeeShort,
      usedLiquidity,
      poolValueUsd,
      maxLiquidity,
    });
  }

  for (const indexTokenStats of Object.values(indexMap)) {
    indexTokenStats.totalUtilization = indexTokenStats.totalMaxLiquidity.gt(0)
      ? indexTokenStats.totalUsedLiquidity.mul(BASIS_POINTS_DIVISOR).div(indexTokenStats.totalMaxLiquidity)
      : 0n;

    indexTokenStats.marketsStats.sort((a, b) => {
      return b.poolValueUsd.gt(a.poolValueUsd) ? 1 : -1;
    });
  }

  const sortedByTotalPoolValue = Object.keys(indexMap).sort((a, b) => {
    return indexMap[b].totalPoolValue.gt(indexMap[a].totalPoolValue) ? 1 : -1;
  });

  return {
    indexMap,
    sortedByTotalPoolValue,
  };
}
