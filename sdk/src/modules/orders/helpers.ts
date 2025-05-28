import type { GasLimitsConfig } from "types/fees";
import { MarketsInfoData } from "types/markets";
import { OrderType } from "types/orders";
import { TokenData, TokensData, TokensRatio } from "types/tokens";
import { SwapAmounts, SwapOptimizationOrderArray } from "types/trade";
import { getByKey } from "utils/objects";
import { getSwapAmountsByFromValue, getSwapAmountsByToValue } from "utils/swap";
import { createFindSwapPath } from "utils/swap/swapPath";
import { convertToUsd, getIsUnwrap, getIsWrap, getTokensRatioByPrice } from "utils/tokens";
import { getIncreasePositionAmounts } from "utils/trade/amounts";

import type { GmxSdk } from "../..";

/** Base Optional params for helpers, allows to avoid calling markets, tokens and uiFeeFactor methods if they are already passed */
interface BaseOptionalParams {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  uiFeeFactor?: bigint;
  gasPrice?: bigint;
  gasLimits?: GasLimitsConfig;
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
  collateralTokenAddress: string;

  /** @default 100 */
  allowedSlippageBps?: number;
  referralCodeForTxn?: string;

  leverage?: bigint;
  /** If presented, then it's limit order */
  limitPrice?: bigint;
  acceptablePriceImpactBuffer?: number;
  fixedAcceptablePriceImpactBps?: bigint;

  skipSimulation?: boolean;
} & BaseOptionalParams;

function passThoughOrFetch<T>(value: T, condition: (input: T) => boolean, fetchFn: () => Promise<T>) {
  if (condition(value)) {
    return value;
  }

  return fetchFn();
}

async function getAndValidateBaseParams(
  sdk: GmxSdk,
  params: BaseOptionalParams
): Promise<Required<BaseOptionalParams>> {
  const [marketsInfoResult, uiFeeFactor, gasPrice, gasLimits] = await Promise.all([
    passThoughOrFetch(
      {
        marketsInfoData: params.marketsInfoData,
        tokensData: params.tokensData,
      },
      (input) => Boolean(input.marketsInfoData) && Boolean(input.tokensData),
      () => sdk.markets.getMarketsInfo()
    ),
    passThoughOrFetch(
      params.uiFeeFactor,
      (input) => input !== undefined,
      () => sdk.utils.getUiFeeFactor()
    ),
    passThoughOrFetch(
      params.gasPrice,
      (input) => input !== undefined,
      () => sdk.utils.getGasPrice()
    ),
    passThoughOrFetch(
      params.gasLimits,
      (input) => input !== undefined,
      () => sdk.utils.getGasLimits()
    ),
  ]);

  if (!marketsInfoResult.marketsInfoData) {
    throw new Error("Markets info data is not available");
  }

  if (!marketsInfoResult.tokensData) {
    throw new Error("Tokens data is not available");
  }

  if (uiFeeFactor === undefined) {
    throw new Error("Ui fee factor is not available");
  }

  if (gasPrice === undefined) {
    throw new Error("Gas price is not available");
  }

  if (gasLimits === undefined) {
    throw new Error("Gas limits are not available");
  }

  return {
    tokensData: marketsInfoResult.tokensData,
    marketsInfoData: marketsInfoResult.marketsInfoData,
    uiFeeFactor,
    gasPrice,
    gasLimits,
  };
}

export async function increaseOrderHelper(
  sdk: GmxSdk,
  params: PositionIncreaseParams & {
    isLong: boolean;
  }
) {
  const { tokensData, marketsInfoData, uiFeeFactor, gasLimits, gasPrice } = await getAndValidateBaseParams(sdk, params);

  const isLimit = Boolean(params.limitPrice);

  const fromToken = tokensData[params.payTokenAddress];
  const collateralToken = tokensData[params.collateralTokenAddress];

  if (!fromToken) {
    throw new Error("payTokenAddress: token is not available");
  }

  if (!collateralToken) {
    throw new Error("collateralTokenAddress: token is not available");
  }

  if (fromToken.isSynthetic) {
    throw new Error("payTokenAddress: synthetic tokens are not supported");
  }

  if (collateralToken.isSynthetic) {
    throw new Error("collateralTokenAddress: synthetic tokens are not supported");
  }

  const marketInfo = getByKey(marketsInfoData, params.marketAddress);

  if (!marketInfo) {
    throw new Error("Market info is not available");
  }

  const collateralTokenAddress = collateralToken.address;
  const allowedSlippage = params.allowedSlippageBps ?? 100;

  const findSwapPath = createFindSwapPath({
    chainId: sdk.chainId,
    fromTokenAddress: params.payTokenAddress,
    toTokenAddress: collateralTokenAddress,
    marketsInfoData,
    gasEstimationParams: {
      gasLimits,
      gasPrice,
      tokensData,
    },
    isExpressFeeSwap: false,
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
    receiveTokenAddress: collateralTokenAddress,
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
  const { tokensData, marketsInfoData, uiFeeFactor, gasLimits, gasPrice } = await getAndValidateBaseParams(sdk, params);

  const fromToken = tokensData[params.fromTokenAddress];
  const toToken = tokensData[params.toTokenAddress];

  if (!fromToken || !toToken) {
    throw new Error("From or to token is not available");
  }

  if (toToken.isSynthetic) {
    throw new Error(`Synthetic tokens are not supported: ${toToken.symbol}`);
  }

  if (fromToken.isSynthetic) {
    throw new Error(`Synthetic tokens are not supported: ${fromToken.symbol}`);
  }

  const isLimit = Boolean(params.triggerPrice);

  if (!fromToken || !toToken) {
    return undefined;
  }

  const findSwapPath = createFindSwapPath({
    chainId: sdk.chainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    marketsInfoData,
    gasEstimationParams: {
      gasLimits,
      gasPrice,
      tokensData,
    },
    isExpressFeeSwap: false,
  });

  const isWrapOrUnwrap = Boolean(
    fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken))
  );

  const swapOptimizationOrder: SwapOptimizationOrderArray | undefined = isLimit ? ["length", "liquidity"] : undefined;

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
