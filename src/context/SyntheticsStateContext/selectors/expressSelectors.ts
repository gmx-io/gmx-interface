import { ARBITRUM } from "config/chains";
import { isDevelopment } from "config/env";
import { GlobalExpressParams } from "domain/synthetics/express";
import { getByKey } from "lib/objects";
import { getRelayerFeeToken } from "sdk/configs/express";
import { createFindSwapPath } from "sdk/utils/swap/swapPath";

import { createSelector } from "../utils";
import {
  selectChainId,
  selectExpressNoncesData,
  selectGasLimits,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectIsRelayRouterEnabled,
  selectIsSponsoredCallAvailable,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectSubaccountForAction,
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
  const gasEstimationParams = q(selectGasEstimationParams);
  const noncesData = q(selectExpressNoncesData);
  const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
  const gasPaymentTokenAddress = q(selectGasPaymentTokenAddress);
  const l1Reference = q(selectL1ExpressOrderGasReference);
  const tokensData = q(selectTokensData);
  const subaccount = q(selectSubaccountForAction);
  const gasLimits = q(selectGasLimits);
  const gasPrice = q(selectGasPrice);
  const gasPaymentAllowance = q(selectGasPaymentTokenAllowance);
  const bufferBps = q(selectExecutionFeeBufferBps);
  const tokenPermits = q(selectTokenPermits);
  const isSponsoredCallAvailable = q(selectIsSponsoredCallAvailable);

  const hasL1Gas = chainId === ARBITRUM;

  if (
    (hasL1Gas && !l1Reference) ||
    !gasPaymentAllowance?.tokensAllowanceData ||
    !tokensData ||
    !marketsInfoData ||
    !gasLimits ||
    gasPrice === undefined ||
    bufferBps === undefined
  ) {
    return undefined;
  }

  const _debugSwapMarketsConfig = isDevelopment() ? q(selectDebugSwapMarketsConfig) : undefined;

  const findFeeSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: gasPaymentTokenAddress,
    toTokenAddress: relayerFeeTokenAddress,
    marketsInfoData,
    isExpressTxn: true,
    disabledMarkets: _debugSwapMarketsConfig?.disabledSwapMarkets,
    manualPath: _debugSwapMarketsConfig?.manualPath,
    gasEstimationParams,
    maxSwapPathLength: 1,
  });

  return {
    l1Reference,
    tokensData,
    marketsInfoData,
    noncesData,
    isSponsoredCall: isSponsoredCallAvailable,
    subaccount,
    findSwapPath: findFeeSwapPath,
    tokenPermits,
    gasPaymentAllowanceData: gasPaymentAllowance?.tokensAllowanceData,
    bufferBps,
    gasPrice,
    gasLimits,
    gasPaymentTokenAddress,
    relayerFeeTokenAddress,
  };
});
