import { getToken } from "config/tokens";
import { createSelector } from "../utils";
import { selectChainId, selectTokensData } from "./globalSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxFromTokenAddress,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "./tradeboxSelectors";
import { getTokenData } from "domain/synthetics/tokens";

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
