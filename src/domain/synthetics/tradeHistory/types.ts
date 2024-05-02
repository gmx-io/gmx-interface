import { MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { TokenData } from "../tokens";
import { BytesLike } from "ethers";

export enum TradeActionType {
  OrderCreated = "OrderCreated",
  OrderExecuted = "OrderExecuted",
  OrderCancelled = "OrderCancelled",
  OrderUpdated = "OrderUpdated",
  OrderFrozen = "OrderFrozen",
}

export type RawTradeAction = {
  id: string;
  eventName: TradeActionType;

  account: string;
  marketAddress?: string;
  swapPath?: string[];
  initialCollateralTokenAddress?: string;

  initialCollateralDeltaAmount?: string;
  sizeDeltaUsd?: string;
  triggerPrice?: string;
  acceptablePrice?: string;
  executionPrice?: string;
  minOutputAmount?: string;
  executionAmountOut?: string;

  priceImpactDiffUsd?: string;
  priceImpactUsd?: string;
  positionFeeAmount?: string;
  borrowingFeeAmount?: string;
  fundingFeeAmount?: string;
  pnlUsd?: string;
  basePnlUsd?: string;

  collateralTokenPriceMax?: string;
  collateralTokenPriceMin?: string;

  indexTokenPriceMin?: string;
  indexTokenPriceMax?: string;

  orderType: OrderType;
  orderKey: string;
  isLong?: boolean;
  shouldUnwrapNativeToken?: boolean;

  reason?: string;
  reasonBytes?: BytesLike;

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export type PositionTradeAction = {
  id: string;
  eventName: TradeActionType;
  marketInfo: MarketInfo;
  marketAddress: string;
  account: string;
  initialCollateralTokenAddress: string;
  initialCollateralToken: TokenData;
  targetCollateralToken: TokenData;
  indexToken: TokenData;
  swapPath: string[];
  initialCollateralDeltaAmount: bigint;
  sizeDeltaUsd: bigint;
  indexTokenPriceMin?: bigint;
  indexTokenPriceMax?: bigint;
  triggerPrice?: bigint;
  acceptablePrice: bigint;
  executionPrice?: bigint;
  collateralTokenPriceMin?: bigint;
  collateralTokenPriceMax?: bigint;
  minOutputAmount: bigint;
  priceImpactUsd?: bigint;
  priceImpactDiffUsd?: bigint;
  positionFeeAmount?: bigint;
  borrowingFeeAmount?: bigint;
  fundingFeeAmount?: bigint;
  pnlUsd?: bigint;
  basePnlUsd?: bigint;
  orderType: OrderType;
  orderKey: string;
  isLong: boolean;
  reason?: string;
  reasonBytes?: BytesLike;

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export type SwapTradeAction = {
  id: string;
  account: string;
  eventName: TradeActionType;
  initialCollateralTokenAddress: string;
  initialCollateralToken: TokenData;
  targetCollateralToken: TokenData;
  shouldUnwrapNativeToken: boolean;
  swapPath: string[];
  initialCollateralDeltaAmount: bigint;
  minOutputAmount: bigint;
  executionAmountOut?: bigint;
  orderType: OrderType;
  orderKey: string;

  reason?: string;
  reasonBytes?: BytesLike;

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export type TradeAction = PositionTradeAction | SwapTradeAction;
