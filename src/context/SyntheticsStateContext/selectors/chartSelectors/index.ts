import { getToken } from "sdk/configs/tokens";
import { getBorrowingFactorPerPeriod, getFundingFactorPerPeriod } from "domain/synthetics/fees";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { getTokenData } from "domain/synthetics/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { CHART_PERIODS } from "lib/legacy";
import { createSelector } from "../../utils";
import { selectChainId, selectTokensData } from "../globalSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxFromTokenAddress,
  selectTradeboxMarketInfo,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "../tradeboxSelectors";

export const selectChartToken = createSelector(function selectChartToken(q) {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);

  if (!fromTokenAddress || !toTokenAddress) {
    return {};
  }

  const chainId = q(selectChainId);
  const { isSwap } = q(selectTradeboxTradeFlags);

  try {
    const fromToken = getToken(chainId, fromTokenAddress);
    const toToken = getToken(chainId, toTokenAddress);
    const chartToken = isSwap && toToken?.isStable && !fromToken?.isStable ? fromToken : toToken;
    const tokensData = q(selectTokensData);

    const symbol = chartToken.symbol;
    const tokenData = getTokenData(tokensData, chartToken?.address);

    return { chartToken: tokenData, symbol };
  } catch (e) {
    return {};
  }
});

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

  const longUsdVolume = marketInfo.longInterestUsd;
  const totalVolume = marketInfo.longInterestUsd + marketInfo.shortInterestUsd;

  const longOpenInterestPercentage =
    totalVolume !== 0n ? Math.max(Math.min(Number(bigMath.mulDiv(longUsdVolume, 100n, totalVolume)), 100), 0.01) : 0;

  const shortOpenInterestPercentage =
    totalVolume === 0n ? 0 : longOpenInterestPercentage !== undefined ? 100 - longOpenInterestPercentage : undefined;

  return {
    liquidityLong: getAvailableUsdLiquidityForPosition(marketInfo, true),
    liquidityShort: getAvailableUsdLiquidityForPosition(marketInfo, false),
    netRateHourlyLong,
    netRateHourlyShort,
    borrowingRateLong,
    borrowingRateShort,
    fundingRateLong,
    fundingRateShort,
    openInterestLong: marketInfo.longInterestUsd,
    openInterestShort: marketInfo.shortInterestUsd,
    decimals: marketInfo.indexToken.decimals,
    longOpenInterestPercentage,
    shortOpenInterestPercentage,
  };
});
