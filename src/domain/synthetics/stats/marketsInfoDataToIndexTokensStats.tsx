import { minInt256 } from "viem";

import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import {
  MarketInfo,
  MarketsInfoData,
  getMaxLeverageByMinCollateralFactor,
  getOpenInterestForBalance,
  getUsedLiquidity,
} from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";
import { CHART_PERIODS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { getMidPrice } from "sdk/utils/tokens";

const MIN_OI_CAP_THRESHOLD_USD = expandDecimals(10000, USD_DECIMALS);

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
  totalOpenInterestLong: bigint;
  totalOpenInterestShort: bigint;
  maxUiAllowedLeverage: number;
};

export type IndexTokensStats = {
  [address: string]: IndexTokenStat;
};

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

    // Skip markets with near-zero OI caps (closed markets with leftover positions)
    const totalMaxOI = marketInfo.maxOpenInterestLong + marketInfo.maxOpenInterestShort;
    if (totalMaxOI < MIN_OI_CAP_THRESHOLD_USD) {
      continue;
    }

    if (!indexMap[marketInfo.indexTokenAddress]) {
      const indexToken = marketInfo.indexToken;
      const price = getMidPrice(indexToken.prices)!;

      indexMap[marketInfo.indexTokenAddress] = {
        token: indexToken,
        price,
        totalPoolValue: 0n,
        totalUtilization: 0n,
        totalUsedLiquidity: 0n,
        totalMaxLiquidity: 0n,
        marketsStats: [],
        bestNetFeeLong: minInt256,
        bestNetFeeShort: minInt256,
        bestNetFeeLongMarketAddress: marketInfo.marketTokenAddress,
        bestNetFeeShortMarketAddress: marketInfo.marketTokenAddress,
        totalOpenInterestLong: 0n,
        totalOpenInterestShort: 0n,
        maxUiAllowedLeverage: 1,
      };
    }

    const indexTokenStats = indexMap[marketInfo.indexTokenAddress];

    const poolValueUsd = marketInfo.poolValueMax;

    const fundingRateLong = getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
    const fundingRateShort = getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);
    const borrowingRateLong = -1n * getBorrowingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
    const borrowingRateShort = -1n * getBorrowingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);

    const [longUsedLiquidity, longMaxLiquidity] = getUsedLiquidity(marketInfo, true);

    const [shortUsedLiquidity, shortMaxLiquidity] = getUsedLiquidity(marketInfo, false);

    const usedLiquidity = longUsedLiquidity + shortUsedLiquidity;
    const maxLiquidity = longMaxLiquidity + shortMaxLiquidity;

    const utilization =
      maxLiquidity > 0 ? bigMath.mulDiv(usedLiquidity, BASIS_POINTS_DIVISOR_BIGINT, maxLiquidity) : 0n;

    const netFeeLong = borrowingRateLong + fundingRateLong;
    const netFeeShort = borrowingRateShort + fundingRateShort;

    indexTokenStats.totalPoolValue += poolValueUsd;
    indexTokenStats.totalUsedLiquidity += usedLiquidity;
    indexTokenStats.totalMaxLiquidity += maxLiquidity;
    indexTokenStats.totalOpenInterestLong += getOpenInterestForBalance(marketInfo, true);
    indexTokenStats.totalOpenInterestShort += getOpenInterestForBalance(marketInfo, false);
    indexTokenStats.maxUiAllowedLeverage = Math.max(
      indexTokenStats.maxUiAllowedLeverage,
      getMaxLeverageByMinCollateralFactor(marketInfo.minCollateralFactor) / 2 / BASIS_POINTS_DIVISOR
    );
    if (netFeeLong > indexTokenStats.bestNetFeeLong) {
      indexTokenStats.bestNetFeeLong = netFeeLong;
      indexTokenStats.bestNetFeeLongMarketAddress = marketInfo.marketTokenAddress;
    }
    if (netFeeShort > indexTokenStats.bestNetFeeShort) {
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
    indexTokenStats.totalUtilization =
      indexTokenStats.totalMaxLiquidity > 0
        ? bigMath.mulDiv(
            indexTokenStats.totalUsedLiquidity,
            BASIS_POINTS_DIVISOR_BIGINT,
            indexTokenStats.totalMaxLiquidity
          )
        : 0n;

    indexTokenStats.marketsStats.sort((a, b) => {
      return b.poolValueUsd > a.poolValueUsd ? 1 : -1;
    });
  }

  const sortedByTotalPoolValue = Object.keys(indexMap).sort((a, b) => {
    return indexMap[b].totalPoolValue > indexMap[a].totalPoolValue ? 1 : -1;
  });

  return {
    indexMap,
    sortedByTotalPoolValue,
  };
}
