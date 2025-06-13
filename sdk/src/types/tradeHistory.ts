import { MarketInfo } from "./markets";
import { OrderType } from "./orders";
import { TokenData } from "./tokens";

export enum TradeActionType {
  OrderCreated = "OrderCreated",
  OrderExecuted = "OrderExecuted",
  OrderCancelled = "OrderCancelled",
  OrderUpdated = "OrderUpdated",
  OrderFrozen = "OrderFrozen",
}

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
  reasonBytes?: string | Uint8Array;
  shouldUnwrapNativeToken: boolean;
  liquidationFeeAmount?: bigint;
  twapParams:
    | {
        twapGroupId: string;
        numberOfParts: number;
      }
    | undefined;
  timestamp: number;
  transaction: {
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
  reasonBytes?: string | Uint8Array;
  twapParams:
    | {
        twapGroupId: string;
        numberOfParts: number;
      }
    | undefined;

  timestamp: number;
  transaction: {
    hash: string;
  };
};

export type TradeAction = PositionTradeAction | SwapTradeAction;
