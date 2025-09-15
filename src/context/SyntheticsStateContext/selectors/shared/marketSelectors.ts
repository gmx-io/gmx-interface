import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getTokenData } from "domain/synthetics/tokens";
import { getToken, getTokenBySymbolSafe } from "sdk/configs/tokens";

import { selectTradeboxFromTokenAddress, selectTradeboxToTokenAddress } from "./baseSelectors";
import { selectTradeboxTradeFlags } from "../tradeboxSelectors";

export const selectChartToken = createSelector((q) => {
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);

  if (!fromTokenAddress || !toTokenAddress) {
    return {};
  }

  const chainId = q(selectChainId);

  try {
    const toToken = getToken(chainId, toTokenAddress);
    const chartToken = toToken;
    const tokensData = q(selectTokensData);

    const symbol = chartToken.symbol;
    const tokenData = getTokenData(tokensData, chartToken?.address);

    return { chartToken: tokenData, symbol };
  } catch (e) {
    return {};
  }
});

/**
 * Returns 1 if swap or no visual multiplier
 */
export const selectSelectedMarketVisualMultiplier = createSelector((q) => {
  const { symbol } = q(selectChartToken);
  const { isSwap } = q(selectTradeboxTradeFlags);

  if (!symbol) {
    return 1;
  }

  const chainId = q(selectChainId);
  const token = getTokenBySymbolSafe(chainId, symbol);

  if (!token) {
    return 1;
  }

  if (!token.visualMultiplier || isSwap) {
    return 1;
  }

  return token.visualMultiplier;
});
