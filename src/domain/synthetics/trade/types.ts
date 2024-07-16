import { FeeItem, SwapFeeItem } from "domain/synthetics/fees";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { MarketInfo } from "../markets";

export enum TradeType {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum TradeMode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

export enum TriggerThresholdType {
  Above = ">",
  Below = "<",
}

export type TradeFlags = {
  isLong: boolean;
  isShort: boolean;
  isSwap: boolean;
  /**
   * ```ts
   * isLong || isShort
   * ```
   */
  isPosition: boolean;
  isIncrease: boolean;
  isTrigger: boolean;
  isMarket: boolean;
  isLimit: boolean;
};

export type SwapAmounts = {
  amountIn: bigint;
  usdIn: bigint;
  amountOut: bigint;
  usdOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  swapPathStats: SwapPathStats | undefined;
  minOutputAmount: bigint;
  uiFeeUsd?: bigint;
};

export type IncreasePositionAmounts = {
  initialCollateralAmount: bigint;
  initialCollateralUsd: bigint;

  collateralDeltaAmount: bigint;
  collateralDeltaUsd: bigint;

  swapPathStats: SwapPathStats | undefined;

  indexTokenAmount: bigint;

  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;

  estimatedLeverage?: bigint;

  indexPrice: bigint;
  initialCollateralPrice: bigint;
  collateralPrice: bigint;
  triggerPrice?: bigint;
  triggerThresholdType?: TriggerThresholdType;
  acceptablePrice: bigint;
  acceptablePriceDeltaBps: bigint;

  positionFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapUiFeeUsd: bigint;
  feeDiscountUsd: bigint;
  borrowingFeeUsd: bigint;
  fundingFeeUsd: bigint;
  positionPriceImpactDeltaUsd: bigint;
};

export type DecreasePositionAmounts = {
  isFullClose: boolean;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaUsd: bigint;
  collateralDeltaAmount: bigint;

  indexPrice: bigint;
  collateralPrice: bigint;
  triggerPrice?: bigint;
  acceptablePrice: bigint;
  acceptablePriceDeltaBps: bigint;
  recommendedAcceptablePriceDeltaBps: bigint;

  estimatedPnl: bigint;
  estimatedPnlPercentage: bigint;
  realizedPnl: bigint;
  realizedPnlPercentage: bigint;

  positionFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapUiFeeUsd: bigint;
  feeDiscountUsd: bigint;
  borrowingFeeUsd: bigint;
  fundingFeeUsd: bigint;
  swapProfitFeeUsd: bigint;
  positionPriceImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  payedRemainingCollateralAmount: bigint;

  payedOutputUsd: bigint;
  payedRemainingCollateralUsd: bigint;

  receiveTokenAmount: bigint;
  receiveUsd: bigint;

  triggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  triggerThresholdType?: TriggerThresholdType;
  decreaseSwapType: DecreasePositionSwapType;
};

export type DepositAmounts = {
  marketTokenAmount: bigint;
  marketTokenUsd: bigint;
  longTokenAmount: bigint;
  longTokenUsd: bigint;
  shortTokenAmount: bigint;
  shortTokenUsd: bigint;
  swapFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
};

export type WitdhrawalAmounts = {
  marketTokenAmount: bigint;
  marketTokenUsd: bigint;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  longTokenUsd: bigint;
  shortTokenUsd: bigint;
  swapFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
};

export type NextPositionValues = {
  nextLeverage?: bigint;
  nextLiqPrice?: bigint;
  nextCollateralUsd?: bigint;
  nextSizeUsd?: bigint;
  nextPnl?: bigint;
  nextPnlPercentage?: bigint;
  nextEntryPrice?: bigint;
  remainingCollateralFeesUsd?: bigint;
};

export type SwapStats = {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  isWrap: boolean;
  isUnwrap: boolean;
  isOutLiquidity?: boolean;
  swapFeeAmount: bigint;
  swapFeeUsd: bigint;
  priceImpactDeltaUsd: bigint;
  amountIn: bigint;
  amountInAfterFees: bigint;
  usdIn: bigint;
  amountOut: bigint;
  usdOut: bigint;
};

export type SwapPathStats = {
  swapPath: string[];
  swapSteps: SwapStats[];
  targetMarketAddress?: string;
  totalSwapPriceImpactDeltaUsd: bigint;
  totalSwapFeeUsd: bigint;
  totalFeesDeltaUsd: bigint;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdOut: bigint;
  amountOut: bigint;
};

export type MarketEdge = {
  marketAddress: string;
  marketInfo: MarketInfo;
  // from token
  from: string;
  // to token
  to: string;
};

export type SwapRoute = {
  edged: MarketEdge[];
  path: string[];
  liquidity: bigint;
};

export type MarketsGraph = {
  abjacencyList: { [token: string]: MarketEdge[] };
  edges: MarketEdge[];
};

export type SwapEstimator = (
  e: MarketEdge,
  usdIn: bigint
) => {
  usdOut: bigint;
};

export type FindSwapPath = (usdIn: bigint, opts: { byLiquidity?: boolean }) => SwapPathStats | undefined;

export type TradeFeesType = "swap" | "increase" | "decrease" | "edit";

export type TradeFees = {
  totalFees?: FeeItem;
  payTotalFees?: FeeItem;
  swapFees?: SwapFeeItem[];
  positionFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionPriceImpact?: FeeItem;
  priceImpactDiff?: FeeItem;
  positionFeeFactor?: bigint;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  uiFee?: FeeItem;
  uiSwapFee?: FeeItem;
  feeDiscountUsd?: bigint;
  swapProfitFee?: FeeItem;
};

export type GmSwapFees = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
};

export type TradeSearchParams = {
  from?: string;
  to?: string;
  mode?: string;
  pool?: string;
  collateral?: string;
  market?: string;
};
