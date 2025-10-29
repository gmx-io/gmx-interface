import { ExternalSwapFeeItem, FeeItem, SwapFeeItem } from "./fees";
import { DecreasePositionSwapType, OrderType } from "./orders";
import { SwapStrategyForIncreaseOrders } from "./swapStrategy";
import { TokensData } from "./tokens";

export enum TradeType {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum TradeMode {
  Market = "Market",
  Limit = "Limit",
  StopMarket = "StopMarket",
  Trigger = "Trigger",
  Twap = "TWAP",
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
  isTwap: boolean;
};

export type SwapAmounts = {
  amountIn: bigint;
  usdIn: bigint;
  amountOut: bigint;
  usdOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  swapStrategy: SwapStrategyForIncreaseOrders;
  minOutputAmount: bigint;
  uiFeeUsd?: bigint;
};

export type IncreasePositionAmounts = {
  initialCollateralAmount: bigint;
  initialCollateralUsd: bigint;

  collateralDeltaAmount: bigint;
  collateralDeltaUsd: bigint;

  swapStrategy: SwapStrategyForIncreaseOrders;
  indexTokenAmount: bigint;

  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;

  estimatedLeverage?: bigint;

  indexPrice: bigint;
  initialCollateralPrice: bigint;
  collateralPrice: bigint;
  triggerPrice?: bigint;
  limitOrderType?: OrderType.LimitIncrease | OrderType.StopIncrease;
  triggerThresholdType?: TriggerThresholdType;
  acceptablePrice: bigint;
  acceptablePriceDeltaBps: bigint;
  recommendedAcceptablePriceDeltaBps: bigint;

  positionFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapUiFeeUsd: bigint;
  feeDiscountUsd: bigint;
  borrowingFeeUsd: bigint;
  fundingFeeUsd: bigint;
  positionPriceImpactDeltaUsd: bigint;
  potentialPriceImpactDiffUsd: bigint;
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
  proportionalPendingImpactDeltaUsd: bigint;
  closePriceImpactDeltaUsd: bigint;
  totalPendingImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  balanceWasImproved: boolean;
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
  glvTokenAmount: bigint;
  glvTokenUsd: bigint;
  shortTokenAmount: bigint;
  shortTokenUsd: bigint;
  swapFeeUsd: bigint;
  uiFeeUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
};

export type WithdrawalAmounts = {
  marketTokenAmount: bigint;
  marketTokenUsd: bigint;
  longTokenAmount: bigint;
  longTokenSwapPathStats: SwapPathStats | undefined;
  shortTokenAmount: bigint;
  longTokenUsd: bigint;
  shortTokenUsd: bigint;
  shortTokenSwapPathStats: SwapPathStats | undefined;
  glvTokenAmount: bigint;
  glvTokenUsd: bigint;
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
  nextPendingImpactDeltaUsd?: bigint;
  potentialPriceImpactDiffUsd?: bigint;
};

export type SwapStats = {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  isWrap: boolean;
  isUnwrap: boolean;
  isOutLiquidity?: boolean;
  isOutCapacity?: boolean;
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
  /**
   * Token Address
   */
  from: string;
  /**
   * Token Address
   */
  to: string;
};

export type SwapRoute = {
  edges: MarketEdge[];
  path: string[];
  liquidity: bigint;
};

type TokenAddress = string;
export type SwapPaths = {
  [from: TokenAddress]: {
    [to: TokenAddress]: TokenAddress[][];
  };
};

export type SwapEstimator = (
  e: MarketEdge,
  usdIn: bigint
) => {
  usdOut: bigint;
};

export type NaiveSwapEstimator = (
  e: MarketEdge,
  usdIn: bigint
) => {
  /**
   * 1.1 means output is 10% greater than input
   * 0.9 means output is 10% less than input
   */
  swapYield: number;
};

export type NaiveNetworkEstimator = (
  usdIn: bigint,
  swapCount: number
) => {
  networkYield: number;
  usdOut: bigint;
};

export type MarketEdgeLiquidityGetter = (e: MarketEdge) => bigint;

export type SwapOptimizationOrderArray = ("liquidity" | "length")[];
export type FindSwapPath = (usdIn: bigint, opts?: { order?: SwapOptimizationOrderArray }) => SwapPathStats | undefined;

export type TradeFeesType = "swap" | "increase" | "decrease" | "edit";

export enum ExternalSwapAggregator {
  OpenOcean = "openOcean",
  BotanixStaking = "botanixStaking",
}

export type ExternalSwapQuote = {
  aggregator: ExternalSwapAggregator;
  inTokenAddress: string;
  outTokenAddress: string;
  receiver: string;
  amountIn: bigint;
  amountOut: bigint;
  usdIn: bigint;
  usdOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  feesUsd: bigint;
  needSpenderApproval?: boolean;
  txnData: {
    to: string;
    data: string;
    value: bigint;
    estimatedGas: bigint;
    estimatedExecutionFee: bigint;
  };
};

export type ExternalSwapPath = {
  aggregator: ExternalSwapAggregator;
  inTokenAddress: string;
  outTokenAddress: string;
};

export type ExternalSwapQuoteParams = {
  chainId: number;
  receiverAddress: string;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
  botanixStakingAssetsPerShare: bigint | undefined;
};

export type ExternalSwapCalculationStrategy = "byFromValue" | "leverageBySize";

export type ExternalSwapInputs = {
  amountIn: bigint;
  priceIn: bigint;
  priceOut: bigint;
  usdIn: bigint;
  usdOut: bigint;
  strategy: ExternalSwapCalculationStrategy;
  internalSwapTotalFeesDeltaUsd?: bigint;
  internalSwapTotalFeeItem?: FeeItem;
  internalSwapAmounts: SwapAmounts;
};

export type TradeFees = {
  totalFees?: FeeItem;
  payTotalFees?: FeeItem;
  swapFees?: SwapFeeItem[];
  positionFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionCollateralPriceImpact?: FeeItem;
  proportionalPendingImpact?: FeeItem;
  increasePositionPriceImpact?: FeeItem;
  decreasePositionPriceImpact?: FeeItem;
  totalPendingImpact?: FeeItem;
  priceImpactDiff?: FeeItem;
  positionNetPriceImpact?: FeeItem;
  collateralNetPriceImpact?: FeeItem;
  collateralPriceImpactDiff?: FeeItem;
  positionFeeFactor?: bigint;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  uiFee?: FeeItem;
  uiSwapFee?: FeeItem;
  feeDiscountUsd?: bigint;
  swapProfitFee?: FeeItem;
  externalSwapFee?: ExternalSwapFeeItem;
};

export type GmSwapFees = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
  shiftFee?: FeeItem;
  logicalNetworkFee?: FeeItem;
};

export type TradeSearchParams = {
  from?: string;
  to?: string;
  mode?: string;
  pool?: string;
  collateral?: string;
  market?: string;
  chainId?: string;
};
