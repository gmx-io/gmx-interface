import { ARBITRUM } from "config/chains";
import { isDevelopment } from "config/env";
import type { GlobalExpressParams } from "domain/synthetics/express";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { getRelayerFeeToken } from "sdk/configs/express";
import { SwapPricingType } from "sdk/utils/orders/types";
import { createFindSwapPath } from "sdk/utils/swap/swapPath";
import type { FindSwapPath } from "sdk/utils/trade/types";

import type { SyntheticsState } from "../SyntheticsStateContextProvider";
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
  selectSrcChainId,
  selectTokensData,
} from "./globalSelectors";
import {
  selectDebugSwapMarketsConfig,
  selectExecutionFeeBufferBps,
  selectExpressOrdersEnabled,
  selectGasPaymentTokenAddress,
  selectGmxAccountGasPaymentTokenAddress,
} from "./settingsSelectors";
import { selectTokenPermits } from "./tokenPermitsSelectors";
import { selectGasEstimationParams } from "./tradeSelectors";

type GasPaymentTokenAddressSelector = (s: SyntheticsState) => string;

function createSelectGasPaymentToken(selectGasPaymentTokenAddressSelector: GasPaymentTokenAddressSelector) {
  return createSelector((q) => {
    const gasPaymentTokenAddress = q(selectGasPaymentTokenAddressSelector);
    return q((state) => getByKey(selectTokensData(state), gasPaymentTokenAddress));
  });
}

export const selectSettlementChainGasPaymentToken = createSelectGasPaymentToken(selectGasPaymentTokenAddress);

export const selectGmxAccountGasPaymentToken = createSelectGasPaymentToken(selectGmxAccountGasPaymentTokenAddress);

export const selectGasPaymentToken = createSelector((q) => {
  const srcChainId = q(selectSrcChainId);
  return q(srcChainId !== undefined ? selectGmxAccountGasPaymentToken : selectSettlementChainGasPaymentToken);
});

export const selectIsExpressTransactionAvailable = createSelector((q) => {
  const isExpressOrdersEnabledSetting = q(selectExpressOrdersEnabled);
  const isRelayRouterEnabled = q(selectIsRelayRouterEnabled);
  const isSponsoredCallAvailable = q(selectIsSponsoredCallAvailable);

  return isExpressOrdersEnabledSetting && isRelayRouterEnabled && isSponsoredCallAvailable;
});

function createSelectExpressFindSwapPath(selectGasPaymentTokenAddressSelector: GasPaymentTokenAddressSelector) {
  return createSelector(function selectExpressFindSwapPath(q): FindSwapPath {
    const chainId = q(selectChainId);
    const marketsInfoData = q(selectMarketsInfoData);
    const gasEstimationParams = q(selectGasEstimationParams);
    const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
    const gasPaymentTokenAddress = q(selectGasPaymentTokenAddressSelector);

    const _debugSwapMarketsConfig = isDevelopment() ? q(selectDebugSwapMarketsConfig) : undefined;

    const findFeeSwapPath = createFindSwapPath({
      chainId,
      fromTokenAddress: gasPaymentTokenAddress,
      toTokenAddress: relayerFeeTokenAddress,
      marketsInfoData,
      disabledMarkets: _debugSwapMarketsConfig?.disabledSwapMarkets,
      manualPath: _debugSwapMarketsConfig?.manualPath,
      gasEstimationParams,
      swapPricingType: SwapPricingType.AtomicSwap,
    });

    return findFeeSwapPath;
  });
}

const selectSettlementChainExpressFindSwapPath = createSelectExpressFindSwapPath(selectGasPaymentTokenAddress);

const selectGmxAccountExpressFindSwapPath = createSelectExpressFindSwapPath(selectGmxAccountGasPaymentTokenAddress);

function createSelectExpressGlobalParams(
  selectGasPaymentTokenAddressSelector: GasPaymentTokenAddressSelector,
  selectExpressFindSwapPathSelector: typeof selectSettlementChainExpressFindSwapPath
) {
  return createSelector(function selectExpressGlobalParamsForActions(q): GlobalExpressParams | undefined {
    const isExpressAvailable = q(selectIsExpressTransactionAvailable);

    if (!isExpressAvailable) {
      return undefined;
    }

    const chainId = q(selectChainId);
    const marketsInfoData = q(selectMarketsInfoData);
    const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;
    const gasPaymentTokenAddress = q(selectGasPaymentTokenAddressSelector);
    const l1Reference = q(selectL1ExpressOrderGasReference);
    const tokensData = q(selectTokensData);
    const gasLimits = q(selectGasLimits);
    const gasPrice = q(selectGasPrice);
    const gasPaymentAllowance = q(selectGasPaymentTokenAllowance);
    const bufferBps = q(selectExecutionFeeBufferBps);
    const tokenPermits = q(selectTokenPermits);

    const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
    const relayerFeeToken = getByKey(tokensData, relayerFeeTokenAddress);

    const hasL1Gas = chainId === ARBITRUM;

    if (
      (hasL1Gas && !l1Reference) ||
      !gasPaymentToken ||
      !relayerFeeToken ||
      !tokensData ||
      !marketsInfoData ||
      !gasLimits ||
      gasPrice === undefined ||
      bufferBps === undefined
    ) {
      return undefined;
    }

    const findFeeSwapPath = q(selectExpressFindSwapPathSelector);

    return {
      chainId,
      l1Reference,
      tokensData,
      marketsInfoData,
      findFeeSwapPath,
      tokenPermits,
      gasPaymentAllowanceData: gasPaymentAllowance?.tokensAllowanceData ?? EMPTY_OBJECT,
      bufferBps,
      gasPrice,
      gasLimits,
      gasPaymentTokenAddress,
      relayerFeeTokenAddress,
      gasPaymentToken,
      relayerFeeToken,
    };
  });
}

export const selectSettlementChainExpressGlobalParams = createSelectExpressGlobalParams(
  selectGasPaymentTokenAddress,
  selectSettlementChainExpressFindSwapPath
);

export const selectGmxAccountExpressGlobalParams = createSelectExpressGlobalParams(
  selectGmxAccountGasPaymentTokenAddress,
  selectGmxAccountExpressFindSwapPath
);

export const selectExpressGlobalParams = createSelector(function selectExpressGlobalParamsForActions(q) {
  const srcChainId = q(selectSrcChainId);
  return q(srcChainId !== undefined ? selectGmxAccountExpressGlobalParams : selectSettlementChainExpressGlobalParams);
});
