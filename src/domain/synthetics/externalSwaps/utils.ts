import { ethers } from "ethers";


import { getSwapDebugSettings } from "config/externalSwaps";
import { UserReferralInfo } from "domain/referrals";
import { applyFactor } from "lib/numbers";
import { parseError } from "lib/parseError";
import Token from "sdk/abis/Token.json";
import { convertTokenAddress, getNativeToken } from "sdk/configs/tokens";
import { MarketInfo } from "sdk/types/markets";
import { PositionInfo } from "sdk/types/positions";
import { TokenData } from "sdk/types/tokens";
import { ExternalSwapInputs } from "sdk/types/trade";
import { getFeeItem, getPositionFee } from "sdk/utils/fees";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";

import {
  ExternalSwapQuote,
  FindSwapPath,
  getIncreasePositionPrices,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  leverageBySizeValues,
} from "../trade";

const tokenContract = new ethers.Interface(Token.abi);

export function getExternalCallsParams(chainId: number, account: string, quote: ExternalSwapQuote) {
  if (!quote.txnData) {
    return [];
  }

  const inTokenAddress = convertTokenAddress(chainId, quote.inTokenAddress, "wrapped");

  const addresses: string[] = [];
  const callData: string[] = [];

  if (quote.needSpenderApproval) {
    addresses.push(inTokenAddress);
    callData.push(tokenContract.encodeFunctionData("approve", [quote.txnData.to, ethers.MaxUint256]));
  }

  if (getSwapDebugSettings()?.failExternalSwaps) {
    addresses.push(quote.inTokenAddress);
  } else {
    addresses.push(quote.txnData.to);
  }

  callData.push(quote.txnData.data);

  const refundTokens = [getNativeToken(chainId).wrappedAddress, inTokenAddress];
  const refundReceivers = [account, account];

  return [addresses, callData, refundTokens, refundReceivers];
}

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

export function isPossibleExternalSwapError(error: Error) {
  const parsedError = parseError(error);

  const isExternalCallError = parsedError?.contractError === "ExternalCallFailed";

  const isPayloadRelatedError = parsedError?.errorMessage?.includes("execution reverted");

  return isExternalCallError || isPayloadRelatedError;
}
