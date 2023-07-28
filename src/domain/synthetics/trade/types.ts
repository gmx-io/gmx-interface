import { BigNumber } from "ethers";
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

export type SwapAmounts = {
  amountIn: BigNumber;
  usdIn: BigNumber;
  amountOut: BigNumber;
  usdOut: BigNumber;
  priceIn: BigNumber;
  priceOut: BigNumber;
  swapPathStats: SwapPathStats | undefined;
  minOutputAmount: BigNumber;
};

export type IncreasePositionAmounts = {
  initialCollateralAmount: BigNumber;
  initialCollateralUsd: BigNumber;

  collateralDeltaAmount: BigNumber;
  collateralDeltaUsd: BigNumber;

  swapPathStats: SwapPathStats | undefined;

  indexTokenAmount: BigNumber;

  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;

  estimatedLeverage?: BigNumber;

  indexPrice: BigNumber;
  initialCollateralPrice: BigNumber;
  collateralPrice: BigNumber;
  triggerPrice?: BigNumber;
  triggerThresholdType?: TriggerThresholdType;
  acceptablePrice: BigNumber;
  acceptablePriceDeltaBps: BigNumber;

  positionFeeUsd: BigNumber;
  feeDiscountUsd: BigNumber;
  borrowingFeeUsd: BigNumber;
  fundingFeeUsd: BigNumber;
  positionPriceImpactDeltaUsd: BigNumber;
};

export type DecreasePositionAmounts = {
  isFullClose: boolean;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  collateralDeltaUsd: BigNumber;
  collateralDeltaAmount: BigNumber;

  indexPrice: BigNumber;
  collateralPrice: BigNumber;
  triggerPrice?: BigNumber;
  acceptablePrice: BigNumber;
  acceptablePriceDeltaBps: BigNumber;

  estimatedPnl: BigNumber;
  estimatedPnlPercentage: BigNumber;
  realizedPnl: BigNumber;

  positionFeeUsd: BigNumber;
  feeDiscountUsd: BigNumber;
  borrowingFeeUsd: BigNumber;
  fundingFeeUsd: BigNumber;
  swapProfitFeeUsd: BigNumber;
  positionPriceImpactDeltaUsd: BigNumber;
  priceImpactDiffUsd: BigNumber;
  payedRemainingCollateralAmount: BigNumber;

  payedOutputUsd: BigNumber;
  payedRemainingCollateralUsd: BigNumber;

  receiveTokenAmount: BigNumber;
  receiveUsd: BigNumber;

  triggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  triggerThresholdType?: TriggerThresholdType;
  decreaseSwapType: DecreasePositionSwapType;
};

export type DepositAmounts = {
  marketTokenAmount: BigNumber;
  marketTokenUsd: BigNumber;
  longTokenAmount: BigNumber;
  longTokenUsd: BigNumber;
  shortTokenAmount: BigNumber;
  shortTokenUsd: BigNumber;
  swapFeeUsd: BigNumber;
  swapPriceImpactDeltaUsd: BigNumber;
};

export type WitdhrawalAmounts = {
  marketTokenAmount: BigNumber;
  marketTokenUsd: BigNumber;
  longTokenAmount: BigNumber;
  shortTokenAmount: BigNumber;
  longTokenUsd: BigNumber;
  shortTokenUsd: BigNumber;
  swapFeeUsd: BigNumber;
  swapPriceImpactDeltaUsd: BigNumber;
};

export type NextPositionValues = {
  nextLeverage?: BigNumber;
  nextLiqPrice?: BigNumber;
  nextCollateralUsd?: BigNumber;
  nextSizeUsd?: BigNumber;
  nextPnl?: BigNumber;
  nextPnlPercentage?: BigNumber;
  nextEntryPrice?: BigNumber;
  remainingCollateralFeesUsd?: BigNumber;
};

export type SwapStats = {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  isWrap: boolean;
  isUnwrap: boolean;
  isOutLiquidity?: boolean;
  swapFeeAmount: BigNumber;
  swapFeeUsd: BigNumber;
  priceImpactDeltaUsd: BigNumber;
  amountIn: BigNumber;
  amountInAfterFees: BigNumber;
  usdIn: BigNumber;
  amountOut: BigNumber;
  usdOut: BigNumber;
};

export type SwapPathStats = {
  swapPath: string[];
  swapSteps: SwapStats[];
  targetMarketAddress?: string;
  totalSwapPriceImpactDeltaUsd: BigNumber;
  totalSwapFeeUsd: BigNumber;
  totalFeesDeltaUsd: BigNumber;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdOut: BigNumber;
  amountOut: BigNumber;
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
  liquidity: BigNumber;
};

export type MarketsGraph = {
  abjacencyList: { [token: string]: MarketEdge[] };
  edges: MarketEdge[];
};

export type SwapEstimator = (
  e: MarketEdge,
  usdIn: BigNumber
) => {
  usdOut: BigNumber;
};

export type FindSwapPath = (usdIn: BigNumber, opts: { byLiquidity?: boolean }) => SwapPathStats | undefined;

export type TradeFeesType = "swap" | "increase" | "decrease" | "edit";

export type TradeFees = {
  totalFees?: FeeItem;
  payTotalFees?: FeeItem;
  swapFees?: SwapFeeItem[];
  positionFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionPriceImpact?: FeeItem;
  positionFeeFactor?: BigNumber;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  feeDiscountUsd?: BigNumber;
  swapProfitFee?: FeeItem;
};

export type GmSwapFees = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
};
