import { MarketsInfoData } from "types/markets";
import { OrderType } from "types/orders";
import { TokenData, TokensData, TokensRatio } from "types/tokens";
import { FindSwapPath, SwapAmounts } from "types/trade";
import { getByKey } from "utils/objects";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "utils/swap";
import { createFindSwapPath, findAllSwapPaths, getWrappedAddress } from "utils/swap/swapPath";
import { convertToUsd, getIsUnwrap, getIsWrap, getTokensRatioByPrice } from "utils/tokens";
import { getIncreasePositionAmounts } from "utils/trade/amounts";

import type { GmxSdk } from "../..";
import { createSwapEstimator, getMarketsGraph } from "utils/swap/swapRouting";

/** Base Optional params for helpers, allows to avoid calling markets, tokens and uiFeeFactor methods if they are already passed */
interface BaseOptionalParams {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  uiFeeFactor?: bigint;
}

export type PositionIncreaseParams = (
  | {
      /** Increase amounts will be calculated based on collateral amount */
      payAmount: bigint;
    }
  | {
      /** Increase amounts will be calculated based on position size amount */
      sizeAmount: bigint;
    }
) & {
  marketAddress: string;
  payTokenAddress: string;

  collateralIn: string;

  /** @default 100 */
  allowedSlippageBps?: number;
  referralCodeForTxn?: string;

  leverage?: bigint;
  /** If presented, then it's limit order */
  limitPrice?: bigint;
  /** If presented, then it's stop market order */
  stopPrice?: bigint;
  receiveTokenAddress?: string;
  acceptablePriceImpactBuffer?: number;
  fixedAcceptablePriceImpactBps?: bigint;

  skipSimulation?: boolean;
} & BaseOptionalParams;

async function getAndValidateBaseParams(sdk: GmxSdk, params: BaseOptionalParams) {
  let tokensData: TokensData | undefined = params.tokensData;
  let marketsInfoData: MarketsInfoData | undefined = params.marketsInfoData;

  if (!params.marketsInfoData && !params.tokensData) {
    const result = await sdk.markets.getMarketsInfo();
    marketsInfoData = result.marketsInfoData;
    tokensData = result.tokensData;
  }

  if (!tokensData) {
    throw new Error("Tokens data is not available");
  }

  if (!marketsInfoData) {
    throw new Error("Markets info data is not available");
  }

  let uiFeeFactor = params.uiFeeFactor;
  if (!uiFeeFactor) {
    uiFeeFactor = await sdk.utils.getUiFeeFactor();
  }

  return {
    tokensData,
    marketsInfoData,
    uiFeeFactor,
  };
}

export async function increaseOrderHelper(
  sdk: GmxSdk,
  params: PositionIncreaseParams & {
    isLong: boolean;
  }
) {
  const { tokensData, marketsInfoData, uiFeeFactor } = await getAndValidateBaseParams(sdk, params);

  const isLimit = Boolean(params.limitPrice);

  const fromToken = tokensData[params.payTokenAddress];
  const collateralToken = tokensData[params.collateralIn];

  if (!fromToken) {
    throw new Error("From token is not available");
  }

  if (!collateralToken) {
    throw new Error("Collateral token is not available");
  }

  const marketInfo = getByKey(marketsInfoData, params.marketAddress);

  if (!marketInfo) {
    throw new Error("Market info is not available");
  }

  const receiveTokenAddress = params.receiveTokenAddress ?? collateralToken.address;
  const allowedSlippage = params.allowedSlippageBps ?? 100;

  const graph = getMarketsGraph(Object.values(marketsInfoData));
  const wrappedFromAddress = getWrappedAddress(sdk.chainId, params.payTokenAddress);
  const wrappedToAddress = getWrappedAddress(sdk.chainId, receiveTokenAddress);

  const allPaths = findAllSwapPaths({
    chainId: sdk.chainId,
    fromTokenAddress: params.payTokenAddress,
    toTokenAddress: receiveTokenAddress,
    marketsInfoData,
    graph,
    wrappedFromAddress,
    wrappedToAddress,
  });

  const estimator = createSwapEstimator(marketsInfoData);

  const findSwapPath = createFindSwapPath({
    chainId: sdk.chainId,
    fromTokenAddress: params.payTokenAddress,
    toTokenAddress: receiveTokenAddress,
    marketsInfoData,
    estimator,
    allPaths,
  });

  const payOrSizeAmount = "payAmount" in params ? params.payAmount : params.sizeAmount;

  const increaseAmounts = getIncreasePositionAmounts({
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: fromToken,
    collateralToken,
    isLong: params.isLong,
    initialCollateralAmount: payOrSizeAmount,
    position: undefined,
    indexTokenAmount: payOrSizeAmount,
    leverage: params.leverage,
    triggerPrice: params.limitPrice,
    limitOrderType: params.limitPrice ? OrderType.LimitIncrease : undefined,
    userReferralInfo: undefined,
    strategy: "payAmount" in params ? "leverageByCollateral" : "leverageBySize",
    findSwapPath: findSwapPath,
    uiFeeFactor,
    acceptablePriceImpactBuffer: params.acceptablePriceImpactBuffer,
    fixedAcceptablePriceImpactBps: params.fixedAcceptablePriceImpactBps,
    externalSwapQuote: undefined,
  });

  const createIncreaseOrderParams: Parameters<typeof sdk.orders.createIncreaseOrder>[0] = {
    marketsInfoData,
    tokensData,
    isLimit,
    marketAddress: params.marketAddress,
    fromToken: tokensData[params.payTokenAddress],
    allowedSlippage,
    collateralToken,
    referralCodeForTxn: params.referralCodeForTxn,
    triggerPrice: params.limitPrice,
    collateralTokenAddress: collateralToken.address,
    isLong: true,
    receiveTokenAddress,
    indexToken: marketInfo.indexToken,
    marketInfo,
    skipSimulation: params.skipSimulation,
    increaseAmounts,
  };

  return sdk.orders.createIncreaseOrder(createIncreaseOrderParams);
}

function getTriggerRatio({
  toToken,
  fromToken,
  triggerPrice,
}: {
  toToken: TokenData;
  fromToken: TokenData;
  triggerPrice: bigint;
}) {
  const fromTokenPrice = fromToken?.prices.minPrice;
  const markPrice = toToken.prices.minPrice;

  const markRatio = getTokensRatioByPrice({
    fromToken,
    toToken,
    fromPrice: fromTokenPrice,
    toPrice: markPrice,
  });

  const triggerRatio: TokensRatio = {
    ratio: triggerPrice > 0 ? triggerPrice : markRatio.ratio,
    largestToken: markRatio.largestToken,
    smallestToken: markRatio.smallestToken,
  };

  return triggerRatio;
}

export type SwapParams = (
  | {
      fromAmount: bigint;
    }
  | {
      toAmount: bigint;
    }
) & {
  fromTokenAddress: string;
  toTokenAddress: string;
  allowedSlippageBps?: number;
  referralCodeForTxn?: string;

  /** If presented, then it's limit swap order */
  triggerPrice?: bigint;
} & BaseOptionalParams;

export async function swap(sdk: GmxSdk, params: SwapParams) {
  const { tokensData, marketsInfoData, uiFeeFactor } = await getAndValidateBaseParams(sdk, params);

  const fromToken = tokensData[params.fromTokenAddress];
  const toToken = tokensData[params.toTokenAddress];

  if (!fromToken || !toToken) {
    throw new Error("From or to token is not available");
  }

  const isLimit = Boolean(params.triggerPrice);

  if (!fromToken || !toToken) {
    return undefined;
  }

  const graph = getMarketsGraph(Object.values(marketsInfoData));
  const wrappedFromAddress = getWrappedAddress(sdk.chainId, params.fromTokenAddress);
  const wrappedToAddress = getWrappedAddress(sdk.chainId, params.toTokenAddress);

  const allPaths = findAllSwapPaths({
    chainId: sdk.chainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    marketsInfoData,
    graph,
    wrappedFromAddress,
    wrappedToAddress,
  });

  const estimator = createSwapEstimator(marketsInfoData);

  const findSwapPath = createFindSwapPath({
    chainId: sdk.chainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    marketsInfoData,
    estimator,
    allPaths,
  });

  const isWrapOrUnwrap = Boolean(
    fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken))
  );

  const swapOptimizationOrder: Parameters<FindSwapPath>[1]["order"] = isLimit ? ["length", "liquidity"] : undefined;

  let swapAmounts: SwapAmounts | undefined;

  const fromTokenPrice = fromToken.prices.minPrice;
  const triggerRatio = params.triggerPrice
    ? getTriggerRatio({
        fromToken,
        toToken,
        triggerPrice: params.triggerPrice,
      })
    : undefined;

  if (isWrapOrUnwrap) {
    const tokenAmount = "fromAmount" in params ? params.fromAmount : params.toAmount;
    const usdAmount = convertToUsd(tokenAmount, fromToken.decimals, fromTokenPrice)!;
    const price = fromTokenPrice;

    swapAmounts = {
      amountIn: tokenAmount,
      usdIn: usdAmount!,
      amountOut: tokenAmount,
      usdOut: usdAmount!,
      swapPathStats: undefined,
      priceIn: price,
      priceOut: price,
      minOutputAmount: tokenAmount,
    };

    return swapAmounts;
  } else if ("fromAmount" in params) {
    swapAmounts = getSwapAmountsByFromValue({
      tokenIn: fromToken,
      tokenOut: toToken,
      amountIn: params.fromAmount,
      triggerRatio,
      isLimit,
      findSwapPath: findSwapPath,
      uiFeeFactor,
      swapOptimizationOrder,
      allowedSwapSlippageBps: isLimit ? BigInt(params.allowedSlippageBps ?? 100) : undefined,
    });
  } else {
    swapAmounts = getSwapAmountsByToValue({
      tokenIn: fromToken,
      tokenOut: toToken,
      amountOut: params.toAmount,
      triggerRatio,
      isLimit: isLimit,
      findSwapPath: findSwapPath,
      uiFeeFactor,
      swapOptimizationOrder,
      allowedSwapSlippageBps: isLimit ? BigInt(params.allowedSlippageBps ?? 100) : undefined,
    });
  }

  if (!swapAmounts) {
    return undefined;
  }

  const createSwapOrderParams: Parameters<typeof sdk.orders.createSwapOrder>[0] = {
    tokensData,
    fromToken: tokensData[params.fromTokenAddress],
    toToken: tokensData[params.toTokenAddress],
    swapAmounts,
    isLimit,
    allowedSlippage: params.allowedSlippageBps ?? 100,
    referralCodeForTxn: params.referralCodeForTxn,
    triggerPrice: params.triggerPrice,
  };

  return sdk.orders.createSwapOrder(createSwapOrderParams);
}
