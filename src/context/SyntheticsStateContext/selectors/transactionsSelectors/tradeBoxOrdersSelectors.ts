import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "sdk/types/orders";
import {
  buildDecreaseOrderPayload,
  buildIncreaseOrderPayload,
  buildSwapOrderPayload,
} from "sdk/utils/orderTransactions";

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

export const selectTradeBoxCreateOrderParams = createSelector((q) => {
  const { isSwap, isIncrease } = q(selectTradeboxTradeFlags);

  if (isSwap) {
    return q(selectTradeboxSwapOrderPayload);
  }

  if (isIncrease) {
    return q(selectTradeboxIncreaseOrderParams);
  }

  return q(selectTradeboxDecreaseOrderParams);
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
    receiver: account,
    chainId,
    executionFeeAmount: executionFee.feeTokenAmount,
    executionGasLimit: executionFee.gasLimit,
    referralCode: referralInfo?.referralCodeForTxn,
    allowedSlippage: isMarket ? allowedSlippage : undefined,
    autoCancel: false,
    uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
  };
});

export const selectTradeboxSwapOrderPayload = createSelector((q) => {
  const commonParams = q(selectCommonOrderParams);

  const fromTokenAddress = q(selectTradeboxFromTokenAddress);
  const toTokenAddress = q(selectTradeboxToTokenAddress);
  const swapAmounts = q(selectTradeboxSwapAmounts);
  const { triggerRatio } = q(selectTradeboxTradeRatios);
  const { isLimit, isMarket } = q(selectTradeboxTradeFlags);
  const allowedSlippage = q(selectTradeboxAllowedSlippage);

  if (!commonParams || !fromTokenAddress || !toTokenAddress || !swapAmounts) {
    return undefined;
  }

  const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

  return buildSwapOrderPayload({
    ...commonParams,
    payTokenAddress: fromTokenAddress,
    payTokenAmount: swapAmounts.amountIn,
    receiveTokenAddress: toTokenAddress,
    minOutputAmount: swapAmounts.minOutputAmount,
    swapPath: swapAmounts.swapPathStats?.swapPath ?? [],
    triggerRatio: triggerRatio?.ratio ?? undefined,
    externalSwapQuote: undefined,
    allowedSlippage: isMarket ? allowedSlippage : 0,
    orderType,
  });
});

export const selectTradeboxIncreaseOrderParams = createSelector((q) => {
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
    // console.log("selectTradeboxIncreaseOrderParams is undefined", {
    //   commonParams: !!commonParams,
    //   fromTokenAddress: !!fromTokenAddress,
    //   marketAddress: !!marketAddress,
    //   indexTokenAddress: !!indexTokenAddress,
    //   collateralTokenAddress: !!collateralTokenAddress,
    //   increaseAmounts: !!increaseAmounts,
    // });
    return undefined;
  }

  const orderType = increaseAmounts.limitOrderType ?? OrderType.MarketIncrease;
  // TODO: External swap handling here!!!!!!!
  //

  return buildIncreaseOrderPayload({
    ...commonParams,
    payTokenAddress: fromTokenAddress,
    payTokenAmount: increaseAmounts.initialCollateralAmount,
    collateralTokenAddress: collateralTokenAddress,
    swapPath: increaseAmounts.swapPathStats?.swapPath ?? [],
    externalSwapQuote: increaseAmounts.externalSwapQuote,
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
  });
});

export const selectTradeboxDecreaseOrderParams = createSelector((q) => {
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
  });
});
