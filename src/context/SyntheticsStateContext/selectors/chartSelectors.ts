import { getToken } from "config/tokens";
import { createSelector } from "../utils";
import { selectChainId, selectTokensData } from "./globalSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxFromTokenAddress,
  selectTradeboxMarketInfo,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "./tradeboxSelectors";
import { getTokenData } from "domain/synthetics/tokens";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { getBorrowingFactorPerPeriod } from "domain/synthetics/fees";
import { getFundingFactorPerPeriod } from "../../../domain/synthetics/fees/utils/index";
import { CHART_PERIODS } from "lib/legacy";

export const selectChartToken = createSelector(function selectChartToken(q) {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);

  if (!fromTokenAddress || !toTokenAddress) {
    return undefined;
  }

  const chainId = q(selectChainId);
  const { isSwap } = q(selectTradeboxTradeFlags);

  try {
    const fromToken = getToken(chainId, fromTokenAddress);
    const toToken = getToken(chainId, toTokenAddress);
    const chartToken = isSwap && toToken?.isStable && !fromToken?.isStable ? fromToken : toToken;
    const tokensData = q(selectTokensData);

    return getTokenData(tokensData, chartToken?.address);
  } catch (e) {
    return undefined;
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

  return {
    liquidityLong: getAvailableUsdLiquidityForPosition(marketInfo, true),
    liquidityShort: getAvailableUsdLiquidityForPosition(marketInfo, false),
    netRateHourlyLong,
    netRateHourlyShort,
    openInterestLong: marketInfo.longInterestUsd,
    openInterestShort: marketInfo.shortInterestUsd,
    decimals: marketInfo.indexToken.decimals,
  };
});
