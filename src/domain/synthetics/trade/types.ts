import { FeeItem } from "domain/synthetics/fees";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { ExternalSwapQuote } from "sdk/types/trade";

export enum TradeType {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum TriggerThresholdType {
  Above = ">",
  Below = "<",
}

export type SwapAmounts = {
  amountIn: bigint;
  usdIn: bigint;
  amountOut: bigint;
  usdOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  swapPathStats: SwapPathStats | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;
  minOutputAmount: bigint;
  uiFeeUsd?: bigint;
};

export type IncreasePositionAmounts = {
  initialCollateralAmount: bigint;
  initialCollateralUsd: bigint;

  collateralDeltaAmount: bigint;
  collateralDeltaUsd: bigint;

  swapPathStats: SwapPathStats | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;

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
  shortTokenAmount: bigint;
  longTokenUsd: bigint;
  shortTokenUsd: bigint;
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

export type FindSwapPath = (usdIn: bigint, opts: { order?: ("liquidity" | "length")[] }) => SwapPathStats | undefined;

export type GmSwapFees = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
  shiftFee?: FeeItem;
};

export type TradeSearchParams = {
  from?: string;
  to?: string;
  mode?: string;
  pool?: string;
  collateral?: string;
  market?: string;
};
