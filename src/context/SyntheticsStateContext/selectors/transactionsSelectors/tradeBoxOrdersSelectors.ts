import { createSelector } from "context/SyntheticsStateContext/utils";
import {
  buildDecreaseOrderPayload,
  buildIncreaseOrderPayload,
  buildSwapOrderPayload,
} from "domain/synthetics/gassless/txns/createOrderBuilders";
import { OrderType } from "sdk/types/orders";

import { selectExternalSwapQuote } from "../externalSwapSelectors";
import { selectAccount, selectChainId, selectUserReferralInfo } from "../globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarketAddress,
  selectTradeboxMarketInfo,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
} from "../tradeboxSelectors";

export const selectTradeBoxOrderPayload = createSelector((q) => {
  const { isSwap, isIncrease } = q(selectTradeboxTradeFlags);

  if (isSwap) {
    return q(selectTradeboxSwapOrderPayload);
  }

  if (isIncrease) {
    return q(selectTradeboxIncreaseOrderPayload);
  }

  return q(selectTradeboxDecreaseOrderPayload);
});

export const selectCommonOrderParams = createSelector((q) => {
  const account = q(selectAccount);
  const chainId = q(selectChainId);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);
  const { isMarket } = q(selectTradeboxTradeFlags);
  const executionFee = q(selectTradeboxExecutionFee);
  const referralInfo = q(selectUserReferralInfo);

  if (!account || !executionFee) {
    return undefined;
  }

  return {
    account,
    chainId,
    executionFee: executionFee.feeTokenAmount,
    referralCode: referralInfo?.referralCodeForTxn,
    allowedSlippage: isMarket ? allowedSlippage : undefined,
    autoCancel: false,
  };
});

export const selectTradeboxSwapOrderPayload = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);

  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const externalSwapQuote = q(selectExternalSwapQuote);
  const { triggerRatio } = q(selectTradeboxTradeRatios);
  const { isLimit, isMarket } = q(selectTradeboxTradeFlags);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);

  if (!commonParams || !fromTokenAddress || !toTokenAddress || !swapAmounts) {
    return undefined;
  }

  const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

  return buildSwapOrderPayload({
    ...commonParams,
    orderType,
    initialCollateralAddress: fromTokenAddress,
    targetCollateralAddress: toTokenAddress,
    initialCollateralDeltaAmount: swapAmounts.amountIn,
    minOutputAmount: swapAmounts.minOutputAmount,
    swapPath: swapAmounts.swapPathStats?.swapPath ?? [],
    triggerRatio: triggerRatio?.ratio ?? undefined,
    externalSwapQuote,
    allowedSlippage: isMarket ? allowedSlippage : 0,
  });
});

export const selectTradeboxIncreaseOrderPayload = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const indexTokenAddress = q(selectTradeboxToTokenAddress);
  const marketAddress = q(selectTradeboxMarketAddress);
  const collateralTokenAddress = q(selectTradeboxCollateralTokenAddress);
  const increaseAmounts = q(selectTradeboxIncreasePositionAmounts);
  const { isLimit, isLong, isMarket } = q(selectTradeboxTradeFlags);
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

  return buildIncreaseOrderPayload({
    ...commonParams,
    orderType,
    initialCollateralAddress: fromTokenAddress,
    initialCollateralDeltaAmount: increaseAmounts.initialCollateralAmount,
    targetCollateralAddress: collateralTokenAddress,
    swapPath: increaseAmounts.swapPathStats?.swapPath ?? [],
    externalSwapQuote: increaseAmounts.externalSwapQuote,
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    acceptablePrice: increaseAmounts.acceptablePrice,
    triggerPrice: isLimit ? triggerPrice : undefined,
    isLong,
    marketAddress,
    indexTokenAddress,
    allowedSlippage: isMarket ? allowedSlippage : 0,
  });
});

export const selectTradeboxDecreaseOrderPayload = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);
  const marketInfo = q(selectTradeboxMarketInfo);
  const collateralTokenAddress: string | undefined = q(selectTradeboxCollateralTokenAddress);
  const decreaseAmounts = q(selectTradeboxDecreasePositionAmounts);
  const { isLong } = q(selectTradeboxTradeFlags);

  if (
    !commonParams ||
    !marketInfo ||
    !collateralTokenAddress ||
    !decreaseAmounts ||
    !decreaseAmounts.triggerOrderType
  ) {
    return undefined;
  }

  return buildDecreaseOrderPayload({
    ...commonParams,
    orderType: decreaseAmounts.triggerOrderType,
    marketAddress: marketInfo.marketTokenAddress,
    initialCollateralAddress: collateralTokenAddress,
    targetCollateralAddress: collateralTokenAddress,
    swapPath: [],
    initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
    sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
    triggerPrice: decreaseAmounts.triggerPrice,
    acceptablePrice: decreaseAmounts.acceptablePrice,
    minOutputUsd: 0n,
    isLong,
    indexTokenAddress: marketInfo.indexToken.address,
    decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
    externalSwapQuote: undefined,
    allowedSlippage: 0,
  });
});
