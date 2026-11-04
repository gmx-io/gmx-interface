import { isUiApiSupported } from "config/api";
import { ARBITRUM } from "config/chains";
import { isDevelopment } from "config/env";
import type { GlobalExpressParams } from "domain/synthetics/express";
import {
  getAvailableGasPaymentTokenAddress,
  getGasPaymentTokenUnavailableReason,
  type GasPaymentTokenUnavailableReason,
} from "domain/synthetics/express/gasPaymentTokenAvailability";
import { getExpressGasPrice } from "domain/synthetics/fees/utils/executionFee";
import { EMPTY_ARRAY, EMPTY_OBJECT, getByKey } from "lib/objects";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { SwapPricingType } from "sdk/utils/orders/types";
import { createFindSwapPath } from "sdk/utils/swap/swapPath";
import type { FindSwapPath } from "sdk/utils/trade/types";

import type { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector, createSelectorFactory } from "../utils";
import {
  selectChainId,
  selectGasLimits,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectIsExpressAvailableFlag,
  selectIsRelayRouterEnabled,
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

const makeSelectExpressFindSwapPathForGasPaymentToken = createSelectorFactory((gasPaymentTokenAddress: string) =>
  createSelectExpressFindSwapPath(() => gasPaymentTokenAddress)
);

export const selectGasPaymentTokensOnchainState = (s: SyntheticsState) => s.gasPaymentTokensOnchainState;

export const selectUnavailableGasPaymentTokens = createSelector(function selectUnavailableGasPaymentTokens(q): Record<
  string,
  GasPaymentTokenUnavailableReason
> {
  const chainId = q(selectChainId);
  const onchainState = q(selectGasPaymentTokensOnchainState);
  const relayerFeeToken = getByKey(q(selectTokensData), getRelayerFeeToken(chainId).address);

  // until markets and price feed flags load, every fee route looks missing
  if (!q(selectMarketsInfoData) || relayerFeeToken?.hasPriceFeedProvider === undefined) {
    return EMPTY_OBJECT;
  }

  const unavailableTokens: Record<string, GasPaymentTokenUnavailableReason> = {};

  for (const tokenAddress of getGasPaymentTokens(chainId)) {
    const reason = getGasPaymentTokenUnavailableReason({
      chainId,
      tokenAddress,
      findFeeSwapPath: q(makeSelectExpressFindSwapPathForGasPaymentToken(tokenAddress)),
      onchainState,
    });

    if (reason !== undefined) {
      unavailableTokens[tokenAddress] = reason;
    }
  }

  return Object.keys(unavailableTokens).length > 0 ? unavailableTokens : EMPTY_OBJECT;
});

export const selectUnavailableGasPaymentTokenAddresses = createSelector((q): string[] => {
  const unavailableTokens = q(selectUnavailableGasPaymentTokens);

  return unavailableTokens === EMPTY_OBJECT ? EMPTY_ARRAY : Object.keys(unavailableTokens);
});

function createSelectExpressFeeTokenAddress(
  selectSavedGasPaymentTokenAddressSelector: GasPaymentTokenAddressSelector,
  isGmxAccount: boolean
) {
  return createSelector((q) =>
    getAvailableGasPaymentTokenAddress({
      chainId: q(selectChainId),
      savedTokenAddress: q(selectSavedGasPaymentTokenAddressSelector),
      unavailableTokens: q(selectUnavailableGasPaymentTokens),
      tokensData: q(selectTokensData),
      isGmxAccount,
    })
  );
}

export const selectSettlementChainExpressFeeTokenAddress = createSelectExpressFeeTokenAddress(
  selectGasPaymentTokenAddress,
  false
);

export const selectGmxAccountExpressFeeTokenAddress = createSelectExpressFeeTokenAddress(
  selectGmxAccountGasPaymentTokenAddress,
  true
);

export const selectSettlementChainGasPaymentToken = createSelectGasPaymentToken(
  selectSettlementChainExpressFeeTokenAddress
);

export const selectGmxAccountGasPaymentToken = createSelectGasPaymentToken(selectGmxAccountExpressFeeTokenAddress);

export const selectGasPaymentToken = createSelector((q) => {
  const srcChainId = q(selectSrcChainId);
  return q(srcChainId !== undefined ? selectGmxAccountGasPaymentToken : selectSettlementChainGasPaymentToken);
});

export const selectIsExpressTransactionAvailable = createSelector((q) => {
  const chainId = q(selectChainId);
  const isExpressOrdersEnabledSetting = q(selectExpressOrdersEnabled);
  const isRelayRouterEnabled = q(selectIsRelayRouterEnabled);
  const isRelayAvailable = q(selectIsExpressAvailableFlag);

  return isUiApiSupported(chainId) && isExpressOrdersEnabledSetting && isRelayRouterEnabled && isRelayAvailable;
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

const selectSettlementChainExpressFindSwapPath = createSelectExpressFindSwapPath(
  selectSettlementChainExpressFeeTokenAddress
);

const selectGmxAccountExpressFindSwapPath = createSelectExpressFindSwapPath(selectGmxAccountExpressFeeTokenAddress);

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
      gasPrice: getExpressGasPrice(chainId, gasPrice),
      gasLimits,
      gasPaymentTokenAddress,
      relayerFeeTokenAddress,
      gasPaymentToken,
      relayerFeeToken,
    };
  });
}

export const selectSettlementChainExpressGlobalParams = createSelectExpressGlobalParams(
  selectSettlementChainExpressFeeTokenAddress,
  selectSettlementChainExpressFindSwapPath
);

export const selectGmxAccountExpressGlobalParams = createSelectExpressGlobalParams(
  selectGmxAccountExpressFeeTokenAddress,
  selectGmxAccountExpressFindSwapPath
);

export const makeSelectSettlementChainExpressGlobalParamsForGasPaymentToken = createSelectorFactory(
  (gasPaymentTokenAddress: string) => {
    const selectGasPaymentTokenAddressOverride = () => gasPaymentTokenAddress;

    return createSelectExpressGlobalParams(
      selectGasPaymentTokenAddressOverride,
      createSelectExpressFindSwapPath(selectGasPaymentTokenAddressOverride)
    );
  }
);

export const selectExpressGlobalParams = createSelector(function selectExpressGlobalParamsForActions(q) {
  const srcChainId = q(selectSrcChainId);
  return q(srcChainId !== undefined ? selectGmxAccountExpressGlobalParams : selectSettlementChainExpressGlobalParams);
});
