import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "sdk/utils/orders/types";
import {
  buildDecreaseOrderPayload,
  buildIncreaseOrderPayload,
  buildTwapOrderPayload,
  buildSwapOrderPayload,
  DecreasePositionOrderParams,
  IncreasePositionOrderParams,
  SwapOrderParams,
} from "sdk/utils/orderTransactions";
import { getIsValidTwapParams } from "sdk/utils/twap";

import {
  selectChainId,
  selectIsAutoCancelTPSLEnabled,
  selectMaxAutoCancelOrders,
  selectSigner,
  selectUserReferralInfo,
} from "../globalSelectors";
import { makeSelectOrdersByPositionKey } from "../orderSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarketAddress,
  selectTradeboxMarketInfo,
  selectTradeboxSelectedPositionKey,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
  selectTradeboxTwapDuration,
  selectTradeboxTwapNumberOfParts,
} from "../tradeboxSelectors";

export const selectTradeBoxCreateOrderParams = createSelector((q) => {
  const { isSwap, isIncrease, isTwap } = q(selectTradeboxTradeFlags);

  if (isTwap) {
    return undefined;
  }

  if (isSwap) {
    return q(selectTradeboxSwapOrderPayload);
  }

  if (isIncrease) {
    return q(selectTradeboxIncreaseOrderParams);
  }

  return q(selectTradeboxDecreaseOrderParams);
});

export const selectTradeBoxTwapParams = createSelector((q) => {
  const { isSwap, isIncrease, isTwap } = q(selectTradeboxTradeFlags);

  if (!isTwap) {
    return undefined;
  }

  if (isSwap) {
    return q(selectTradeboxSwapTwapParams);
  }

  if (isIncrease) {
    return q(selectTradeboxIncreaseTwapParams);
  }

  return q(selectTradeboxDecreaseTwapParams);
});

const selectCommonOrderParams = createSelector((q) => {
  const signer = q(selectSigner);
  const chainId = q(selectChainId);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);
  const { isMarket } = q(selectTradeboxTradeFlags);
  const executionFee = q(selectTradeboxExecutionFee);
  const referralInfo = q(selectUserReferralInfo);

  if (!executionFee) {
    return undefined;
  }

  return {
    receiver: signer?.address,
    chainId,
    executionFeeAmount: executionFee.feeTokenAmount,
    executionGasLimit: executionFee.gasLimit,
    referralCode: referralInfo?.referralCodeForTxn,
    allowedSlippage: isMarket ? allowedSlippage : undefined,
    autoCancel: false,
    uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
  };
});

const selectTradeboxSwapOrderPayload = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);

  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const { triggerRatio } = q(selectTradeboxTradeRatios);
  const { isLimit, isMarket, isTwap } = q(selectTradeboxTradeFlags);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);

  if (!commonParams || !fromTokenAddress || !toTokenAddress || !swapAmounts) {
    return undefined;
  }

  const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

  const swapOrderParams: SwapOrderParams = {
    ...commonParams,
    payTokenAddress: fromTokenAddress,
    payTokenAmount: swapAmounts.amountIn,
    receiveTokenAddress: toTokenAddress,
    minOutputAmount: swapAmounts.minOutputAmount,
    expectedOutputAmount: swapAmounts.amountOut,
    swapPath: swapAmounts.swapStrategy.swapPathStats?.swapPath ?? [],
    triggerRatio: triggerRatio?.ratio ?? undefined,
    externalSwapQuote: swapAmounts.swapStrategy.externalSwapQuote,
    allowedSlippage: isMarket ? allowedSlippage : 0,
    orderType,
    validFromTime: 0n,
    uiFeeReceiver: commonParams.uiFeeReceiver,
  };

  if (isTwap) {
    return undefined;
  }

  return [buildSwapOrderPayload(swapOrderParams)];
});

const selectTradeboxIncreaseOrderParams = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const { isLimit, isLong, isMarket, isTwap } = q(selectTradeboxTradeFlags);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);
  const triggerPrice = q(selectTradeboxTriggerPrice);

  if (
    !commonParams ||
    !fromTokenAddress ||
    !marketAddress ||
    !indexTokenAddress ||
    !collateralTokenAddress ||
    !increaseAmounts
  ) {
    return undefined;
  }

  const orderType = increaseAmounts.limitOrderType ?? OrderType.MarketIncrease;

  const increaseOrderParams: IncreasePositionOrderParams = {
    ...commonParams,
    payTokenAddress: fromTokenAddress,
    payTokenAmount: increaseAmounts.initialCollateralAmount,
    collateralTokenAddress: collateralTokenAddress,
    swapPath: increaseAmounts.swapStrategy.swapPathStats?.swapPath ?? [],
    externalSwapQuote: increaseAmounts.swapStrategy.externalSwapQuote,
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
    collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
    acceptablePrice: increaseAmounts.acceptablePrice,
    triggerPrice: isLimit ? triggerPrice : undefined,
    orderType,
    isLong,
    marketAddress,
    indexTokenAddress,
    allowedSlippage: isMarket ? allowedSlippage : 0,
    validFromTime: 0n,
    uiFeeReceiver: commonParams.uiFeeReceiver,
  };

  if (isTwap) {
    return undefined;
  }

  return [buildIncreaseOrderPayload(increaseOrderParams)];
});

const selectTradeboxDecreaseOrderParams = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const marketInfo = q(selectTradeboxMarketInfo);
  const collateralTokenAddress: string | undefined = q(selectTradeboxCollateralTokenAddress);
  const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
  const selectedPositionKey = q(selectTradeboxSelectedPositionKey);
  const maxAutoCancelOrders = q(selectMaxAutoCancelOrders);
  const positionOrders = q(makeSelectOrdersByPositionKey(selectedPositionKey));
  const { isLong, isTwap } = q(selectTradeboxTradeFlags);
  const isAutoCancelTPSLEnabled = q(selectIsAutoCancelTPSLEnabled);

  if (
    !commonParams ||
    !marketInfo ||
    !collateralTokenAddress ||
    !decreaseAmounts ||
    !decreaseAmounts.triggerOrderType
  ) {
    return undefined;
  }

  if (isTwap) {
    return undefined;
  }

  const existingAutoCancelOrders = positionOrders.filter((order) => order.autoCancel);
  const allowedAutoCancelOrdersNumber = isAutoCancelTPSLEnabled ? Number(maxAutoCancelOrders) : 0;
  const autoCancelOrdersLimit = allowedAutoCancelOrdersNumber - existingAutoCancelOrders.length;

  const decreaseOrderParams: DecreasePositionOrderParams = {
    ...commonParams,
    orderType: decreaseAmounts.triggerOrderType,
    marketAddress: marketInfo.marketTokenAddress,
    indexTokenAddress: marketInfo.indexToken.address,
    collateralTokenAddress: collateralTokenAddress,
    collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount ?? 0n,
    receiveTokenAddress: collateralTokenAddress,
    swapPath: [],
    sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
    triggerPrice: decreaseAmounts.triggerPrice,
    acceptablePrice: decreaseAmounts.acceptablePrice,
    decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
    externalSwapQuote: undefined,
    allowedSlippage: 0,
    minOutputUsd: 0n,
    isLong,
    validFromTime: 0n,
    uiFeeReceiver: commonParams.uiFeeReceiver,
    autoCancel: autoCancelOrdersLimit > 0,
  };

  return [buildDecreaseOrderPayload(decreaseOrderParams)];
});

const selectTradeboxSwapTwapParams = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const { triggerRatio } = q(selectTradeboxTradeRatios);
  const { isMarket } = q(selectTradeboxTradeFlags);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);
  const duration = q(selectTradeboxTwapDuration);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);

  if (!commonParams || !fromTokenAddress || !toTokenAddress || !swapAmounts) {
    return undefined;
  }

  if (!getIsValidTwapParams(duration, numberOfParts)) {
    return undefined;
  }

  const orderType = isMarket ? OrderType.MarketSwap : OrderType.LimitSwap;

  const swapOrderParams: SwapOrderParams = {
    ...commonParams,
    payTokenAddress: fromTokenAddress,
    payTokenAmount: swapAmounts.amountIn,
    receiveTokenAddress: toTokenAddress,
    minOutputAmount: swapAmounts.minOutputAmount,
    expectedOutputAmount: swapAmounts.amountOut,
    swapPath: swapAmounts.swapStrategy.swapPathStats?.swapPath ?? [],
    triggerRatio: triggerRatio?.ratio ?? undefined,
    externalSwapQuote: undefined,
    allowedSlippage: isMarket ? allowedSlippage : 0,
    orderType,
    validFromTime: 0n,
    uiFeeReceiver: commonParams.uiFeeReceiver,
  };

  return buildTwapOrderPayload(swapOrderParams, {
    duration,
    numberOfParts,
  });
});

const selectTradeboxIncreaseTwapParams = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const { isLimit, isLong, isMarket } = q(selectTradeboxTradeFlags);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);
  const triggerPrice = q(selectTradeboxTriggerPrice);
  const duration = q(selectTradeboxTwapDuration);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);

  if (
    !commonParams ||
    !fromTokenAddress ||
    !marketAddress ||
    !indexTokenAddress ||
    !collateralTokenAddress ||
    !increaseAmounts
  ) {
    return undefined;
  }

  if (!getIsValidTwapParams(duration, numberOfParts)) {
    return undefined;
  }

  const orderType = increaseAmounts.limitOrderType ?? OrderType.MarketIncrease;

  const increaseOrderParams: IncreasePositionOrderParams = {
    ...commonParams,
    payTokenAddress: fromTokenAddress,
    payTokenAmount: increaseAmounts.initialCollateralAmount,
    collateralTokenAddress: collateralTokenAddress,
    swapPath: increaseAmounts.swapStrategy.swapPathStats?.swapPath ?? [],
    externalSwapQuote: undefined,
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
    collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
    acceptablePrice: increaseAmounts.acceptablePrice,
    triggerPrice: isLimit ? triggerPrice : undefined,
    orderType,
    isLong,
    marketAddress,
    indexTokenAddress,
    allowedSlippage: isMarket ? allowedSlippage : 0,
    validFromTime: 0n,
    uiFeeReceiver: commonParams.uiFeeReceiver,
  };

  return buildTwapOrderPayload(increaseOrderParams, {
    duration,
    numberOfParts,
  });
});

const selectTradeboxDecreaseTwapParams = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const marketInfo = q(selectTradeboxMarketInfo);
  const collateralTokenAddress: string | undefined = q(selectTradeboxCollateralTokenAddress);
  const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
  const { isLong } = q(selectTradeboxTradeFlags);
  const duration = q(selectTradeboxTwapDuration);
  const numberOfParts = q(selectTradeboxTwapNumberOfParts);

  if (
    !commonParams ||
    !marketInfo ||
    !collateralTokenAddress ||
    !decreaseAmounts ||
    !decreaseAmounts.triggerOrderType
  ) {
    return undefined;
  }

  if (!getIsValidTwapParams(duration, numberOfParts)) {
    return undefined;
  }

  const decreaseOrderParams: DecreasePositionOrderParams = {
    ...commonParams,
    orderType: decreaseAmounts.triggerOrderType,
    marketAddress: marketInfo.marketTokenAddress,
    indexTokenAddress: marketInfo.indexToken.address,
    collateralTokenAddress: collateralTokenAddress,
    collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount ?? 0n,
    receiveTokenAddress: collateralTokenAddress,
    swapPath: [],
    sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
    sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
    triggerPrice: decreaseAmounts.triggerPrice,
    acceptablePrice: decreaseAmounts.acceptablePrice,
    decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
    externalSwapQuote: undefined,
    allowedSlippage: 0,
    minOutputUsd: 0n,
    isLong,
    validFromTime: 0n,
    uiFeeReceiver: commonParams.uiFeeReceiver,
    autoCancel: false,
  };

  return buildTwapOrderPayload(decreaseOrderParams, {
    duration,
    numberOfParts,
  });
});
