import { ARBITRUM } from "config/chains";
import { isDevelopment } from "config/env";
import type { GlobalExpressParams } from "domain/synthetics/express";
import { getByKey } from "lib/objects";
import { getRelayerFeeToken } from "sdk/configs/express";
import type { FindSwapPath } from "sdk/types/trade";
import { createFindSwapPath } from "sdk/utils/swap/swapPath";

import { createSelector } from "../utils";
import {
  selectChainId,
  selectGasLimits,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectIsRelayRouterEnabled,
  selectIsSponsoredCallAvailable,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectTokensData,
} from "./globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectExecutionFeeBufferBps,
  selectExpressOrdersEnabled,
  selectGasPaymentTokenAddress,
} from "./settingsSelectors";
import { selectTokenPermits } from "./tokenPermitsSelectors";
import { selectGasEstimationParams } from "./tradeSelectors";

export const selectGasPaymentToken = createSelector((q) => {
  const gasPaymentTokenAddress = q(selectGasPaymentTokenAddress);
  return q((state) => getByKey(selectTokensData(state), gasPaymentTokenAddress));
});

export const selectRelayerFeeToken = createSelector((q) => {
  const chainId = q(selectChainId);
  const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
  return q((state) => getByKey(selectTokensData(state), relayerFeeTokenAddress));
});

export const selectIsExpressTransactionAvailable = createSelector((q) => {
  const isExpressOrdersEnabledSetting = q(selectExpressOrdersEnabled);
  const isRelayRouterEnabled = q(selectIsRelayRouterEnabled);

  return isExpressOrdersEnabledSetting && isRelayRouterEnabled;
});

export const selectExpressGlobalParams = createSelector(function selectExpressGlobalParamsForActions(q):
  | GlobalExpressParams
  | undefined {
  const isExpressAvailable = q(selectIsExpressTransactionAvailable);

  if (!isExpressAvailable) {
    return undefined;
  }

  const chainId = q(selectChainId);
  const marketsInfoData = q(selectMarketsInfoData);
  const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
  const gasPaymentTokenAddress = q(selectGasPaymentTokenAddress);
  const l1Reference = q(selectL1ExpressOrderGasReference);
  const tokensData = q(selectTokensData);
  const gasLimits = q(selectGasLimits);
  const gasPrice = q(selectGasPrice);
  const gasPaymentAllowance = q(selectGasPaymentTokenAllowance);
  const bufferBps = q(selectExecutionFeeBufferBps);
  const tokenPermits = q(selectTokenPermits);
  const isSponsoredCallAvailable = q(selectIsSponsoredCallAvailable);

  const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
  const relayerFeeToken = getByKey(tokensData, relayerFeeTokenAddress);

  const hasL1Gas = chainId === ARBITRUM;

  if (
    (hasL1Gas && !l1Reference) ||
    !gasPaymentToken ||
    !relayerFeeToken ||
    !gasPaymentAllowance?.tokensAllowanceData ||
    !tokensData ||
    !marketsInfoData ||
    !gasLimits ||
    gasPrice === undefined ||
    bufferBps === undefined
  ) {
    return undefined;
  }

  const findFeeSwapPath = q(selectExpressFindSwapPath);

  return {
    l1Reference,
    tokensData,
    marketsInfoData,
    isSponsoredCall: isSponsoredCallAvailable,
    findFeeSwapPath,
    tokenPermits,
    gasPaymentAllowanceData: gasPaymentAllowance?.tokensAllowanceData,
    bufferBps,
    gasPrice,
    gasLimits,
    gasPaymentTokenAddress,
    relayerFeeTokenAddress,
    gasPaymentToken,
    relayerFeeToken,
  };
});

export const selectExpressFindSwapPath = createSelector(function selectExpressFindSwapPath(q): FindSwapPath {
  const chainId = q(selectChainId);
  const marketsInfoData = q(selectMarketsInfoData);
  const gasEstimationParams = q(selectGasEstimationParams);
  const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
  const gasPaymentTokenAddress = q(selectGasPaymentTokenAddress);

  const _debugSwapMarketsConfig = isDevelopment() ? q(selectDebugSwapMarketsConfig) : undefined;

  const findFeeSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: gasPaymentTokenAddress,
    toTokenAddress: relayerFeeTokenAddress,
    marketsInfoData,
    isExpressFeeSwap: true,
    disabledMarkets: _debugSwapMarketsConfig?.disabledSwapMarkets,
    manualPath: _debugSwapMarketsConfig?.manualPath,
    gasEstimationParams,
  });

  return findFeeSwapPath;
});
