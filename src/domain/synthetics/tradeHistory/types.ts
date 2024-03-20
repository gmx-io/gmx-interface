import { MarketInfo } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders";
import { BigNumber, Bytes } from "ethers";
import { TokenData } from "../tokens";

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
  reasonBytes?: Bytes;

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
  initialCollateralDeltaAmount: BigNumber;
  sizeDeltaUsd: BigNumber;
  indexTokenPriceMin?: BigNumber;
  indexTokenPriceMax?: BigNumber;
  triggerPrice?: BigNumber;
  acceptablePrice: BigNumber;
  executionPrice?: BigNumber;
  collateralTokenPriceMin?: BigNumber;
  collateralTokenPriceMax?: BigNumber;
  minOutputAmount: BigNumber;
  priceImpactUsd?: BigNumber;
  priceImpactDiffUsd?: BigNumber;
  positionFeeAmount?: BigNumber;
  borrowingFeeAmount?: BigNumber;
  fundingFeeAmount?: BigNumber;
  pnlUsd?: BigNumber;
  basePnlUsd?: BigNumber;
  orderType: OrderType;
  orderKey: string;
  isLong: boolean;
  reason?: string;
  reasonBytes?: Bytes;

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
  initialCollateralDeltaAmount: BigNumber;
  minOutputAmount: BigNumber;
  executionAmountOut?: BigNumber;
  orderType: OrderType;
  orderKey: string;

  reason?: string;
  reasonBytes?: Bytes;

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export type TradeAction = PositionTradeAction | SwapTradeAction;
