import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxFromTokenAddress,
  selectTradeboxMarketInfo,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import { getAvailableUsdLiquidityForPosition, getOpenInterestForBalance } from "domain/synthetics/markets";
import { CHART_PERIODS } from "lib/legacy";
import { bigMath } from "sdk/utils/bigmath";

export { selectChartToken } from "../shared/marketSelectors";

export const selectAvailableChartTokens = createSelector(function selectChartToken(q) {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);

  if (!fromTokenAddress || !toTokenAddress) {
    return [];
  }

  const { isSwap } = q(selectTradeboxTradeFlags);
  const { swapTokens, indexTokens, sortedLongAndShortTokens, sortedIndexTokensWithPoolValue } = q(
    selectTradeboxAvailableTokensOptions
  );

  const availableChartTokens = isSwap ? swapTokens : indexTokens;
  const sortedAvailableChartTokens = availableChartTokens.sort((a, b) => {
    if (sortedIndexTokensWithPoolValue || sortedLongAndShortTokens) {
      const currentSortReferenceList = isSwap ? sortedLongAndShortTokens : sortedIndexTokensWithPoolValue;
      return currentSortReferenceList.indexOf(a.address) - currentSortReferenceList.indexOf(b.address);
    }
    return 0;
  });

  return sortedAvailableChartTokens;
});

export const selectChartHeaderInfo = createSelector((q) => {
  const marketInfo = q(selectTradeboxMarketInfo);

  if (!marketInfo) {
    return;
  }

  const borrowingRateLong = -getBorrowingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
  const borrowingRateShort = -getBorrowingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);
  const fundingRateLong = getFundingFactorPerPeriod(marketInfo, true, CHART_PERIODS["1h"]);
  const fundingRateShort = getFundingFactorPerPeriod(marketInfo, false, CHART_PERIODS["1h"]);

  const netRateHourlyLong = (fundingRateLong ?? 0n) + (borrowingRateLong ?? 0n);
  const netRateHourlyShort = (fundingRateShort ?? 0n) + (borrowingRateShort ?? 0n);

  const longUsdInterest = getOpenInterestForBalance(marketInfo, true);
  const shortUsdInterest = getOpenInterestForBalance(marketInfo, false);
  const totalInterest = longUsdInterest + shortUsdInterest;

  const longOpenInterestPercentage =
    totalInterest !== 0n
      ? Math.max(Math.min(Math.round(Number(bigMath.mulDiv(longUsdInterest, 10000n, totalInterest)) / 100), 100), 0.01)
      : 0;

  const shortOpenInterestPercentage =
    totalInterest === 0n ? 0 : longOpenInterestPercentage !== undefined ? 100 - longOpenInterestPercentage : undefined;

  return {
    liquidityLong: getAvailableUsdLiquidityForPosition(marketInfo, true),
    liquidityShort: getAvailableUsdLiquidityForPosition(marketInfo, false),
    netRateHourlyLong,
    netRateHourlyShort,
    borrowingRateLong,
    borrowingRateShort,
    fundingRateLong,
    fundingRateShort,
    openInterestLong: longUsdInterest,
    openInterestShort: shortUsdInterest,
    decimals: marketInfo.indexToken.decimals,
    longOpenInterestPercentage,
    shortOpenInterestPercentage,
  };
});
