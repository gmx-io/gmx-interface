import { getSwapDebugSettings } from "config/externalSwaps";
import { UserReferralInfo } from "domain/referrals";
import { ErrorLike, parseError } from "lib/errors";
import { applyFactor } from "lib/numbers";
import { MarketInfo } from "sdk/types/markets";
import { PositionInfo } from "sdk/types/positions";
import { TokenData } from "sdk/types/tokens";
import { ExternalSwapInputs, ExternalSwapQuote, SwapAmounts } from "sdk/types/trade";
import { getFeeItem, getPositionFee } from "sdk/utils/fees";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";

import {
  FindSwapPath,
  getIncreasePositionPrices,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  leverageBySizeValues,
} from "../trade";

export function getExternalSwapInputsByFromValue({
  tokenIn,
  tokenOut,
  amountIn,
  findSwapPath,
  uiFeeFactor,
}: {
  tokenIn: TokenData;
  tokenOut: TokenData;
  amountIn: bigint;
  findSwapPath: FindSwapPath;
  uiFeeFactor: bigint;
}): ExternalSwapInputs {
  const swapAmounts = getSwapAmountsByFromValue({
    tokenIn,
    tokenOut,
    amountIn,
    isLimit: false,
    findSwapPath,
    uiFeeFactor,
  });

  const internalSwapTotalFeesDeltaUsd = swapAmounts.swapPathStats
    ? swapAmounts.swapPathStats.totalFeesDeltaUsd
    : undefined;

  const internalSwapTotalFeeItem = getFeeItem(internalSwapTotalFeesDeltaUsd, swapAmounts.usdIn);

  return {
    amountIn,
    priceIn: swapAmounts.priceIn,
    priceOut: swapAmounts.priceOut,
    usdIn: swapAmounts.usdIn,
    usdOut: swapAmounts.usdOut,
    strategy: "byFromValue",
    internalSwapTotalFeeItem,
    internalSwapTotalFeesDeltaUsd,
    internalSwapAmounts: swapAmounts,
  };
}

export function getExternalSwapInputsByLeverageSize({
  marketInfo,
  tokenIn,
  collateralToken,
  indexTokenAmount,
  findSwapPath,
  uiFeeFactor,
  triggerPrice,
  existingPosition,
  leverage,
  isLong,
  userReferralInfo,
}: {
  tokenIn: TokenData;
  collateralToken: TokenData;
  marketInfo: MarketInfo;
  indexTokenAmount: bigint;
  uiFeeFactor: bigint;
  triggerPrice?: bigint;
  existingPosition?: PositionInfo;
  leverage: bigint;
  isLong: boolean;
  findSwapPath: FindSwapPath;
  userReferralInfo: UserReferralInfo | undefined;
}): ExternalSwapInputs {
  const prices = getIncreasePositionPrices({
    triggerPrice,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: tokenIn,
    collateralToken,
    isLong,
  });

  const sizeDeltaUsd = convertToUsd(indexTokenAmount, marketInfo.indexToken.decimals, prices.indexPrice)!;

  const positionFeeInfo = getPositionFee(marketInfo, sizeDeltaUsd, false, userReferralInfo);

  const positionFeeUsd = positionFeeInfo.positionFeeUsd;
  const uiFeeUsd = applyFactor(sizeDeltaUsd, uiFeeFactor);

  const { baseCollateralAmount } = leverageBySizeValues({
    collateralToken,
    leverage,
    sizeDeltaUsd,
    collateralPrice: prices.collateralPrice,
    uiFeeFactor,
    positionFeeUsd,
    fundingFeeUsd: existingPosition?.pendingFundingFeesUsd || 0n,
    borrowingFeeUsd: existingPosition?.pendingBorrowingFeesUsd || 0n,
    uiFeeUsd,
    swapUiFeeUsd: 0n,
  });

  const usdOut = convertToUsd(baseCollateralAmount, collateralToken.decimals, collateralToken.prices.maxPrice)!;
  const baseUsdIn = usdOut;
  const baseAmountIn = convertToTokenAmount(baseUsdIn, tokenIn.decimals, tokenIn.prices.minPrice)!;

  const swapAmounts = getSwapAmountsByToValue({
    tokenIn,
    tokenOut: collateralToken,
    amountOut: baseCollateralAmount,
    isLimit: false,
    findSwapPath,
    uiFeeFactor,
  });

  const internalSwapTotalFeesDeltaUsd = swapAmounts.swapPathStats
    ? swapAmounts.swapPathStats.totalFeesDeltaUsd
    : undefined;

  const internalSwapTotalFeeItem = getFeeItem(internalSwapTotalFeesDeltaUsd, swapAmounts.usdIn);

  return {
    amountIn: baseAmountIn,
    priceIn: swapAmounts.priceIn,
    priceOut: swapAmounts.priceOut,
    usdIn: baseUsdIn,
    usdOut: swapAmounts.usdOut,
    strategy: "leverageBySize",
    internalSwapTotalFeeItem,
    internalSwapTotalFeesDeltaUsd,
    internalSwapAmounts: swapAmounts,
  };
}

export function getIsPossibleExternalSwapError(error: ErrorLike) {
  const parsedError = parseError(error);

  const isExternalCallError = parsedError?.contractError === "ExternalCallFailed";

  const isPayloadRelatedError = parsedError?.errorMessage?.includes("execution reverted");

  return isExternalCallError || isPayloadRelatedError;
}

export function getBestSwapStrategy({
  internalSwapAmounts,
  externalSwapQuote,
}: {
  internalSwapAmounts: SwapAmounts | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;
}) {
  const forceExternalSwaps = getSwapDebugSettings()?.failExternalSwaps;

  let amountIn: bigint;
  let amountOut: bigint;
  let usdIn: bigint;
  let usdOut: bigint;

  if (
    externalSwapQuote &&
    (externalSwapQuote.usdOut > (internalSwapAmounts?.swapPathStats?.usdOut ?? 0n) || forceExternalSwaps)
  ) {
    amountIn = externalSwapQuote.amountIn;
    amountOut = externalSwapQuote.amountOut;
    usdIn = externalSwapQuote.usdIn;
    usdOut = externalSwapQuote.usdOut;

    return {
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      externalSwapQuote,
    };
  } else if (internalSwapAmounts?.swapPathStats) {
    amountIn = internalSwapAmounts.amountIn;
    amountOut = internalSwapAmounts.amountOut;
    usdIn = internalSwapAmounts.usdIn;
    usdOut = internalSwapAmounts.usdOut;

    return {
      amountIn,
      amountOut,
      usdIn,
      usdOut,
      swapPath: internalSwapAmounts.swapPathStats.swapPath,
    };
  } else {
    return undefined;
  }
}

export function getIsInternalSwapBetter({
  internalSwapAmounts,
  externalSwapQuote,
  forceExternalSwaps,
}: {
  internalSwapAmounts: SwapAmounts | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;
  forceExternalSwaps: boolean | undefined;
}) {
  if (externalSwapQuote?.usdOut == undefined) {
    return true;
  }

  if (forceExternalSwaps) {
    return false;
  }

  return (
    internalSwapAmounts?.swapPathStats?.usdOut !== undefined &&
    internalSwapAmounts!.swapPathStats!.usdOut! > (externalSwapQuote?.usdOut ?? 0n)
  );
}
