import { MarketInfo } from "utils/markets/types";
import { OrderType } from "utils/orders/types";
import { TokenData } from "utils/tokens/types";

export enum TradeActionType {
  OrderCreated = "OrderCreated",
  OrderExecuted = "OrderExecuted",
  OrderCancelled = "OrderCancelled",
  OrderUpdated = "OrderUpdated",
  OrderFrozen = "OrderFrozen",
}

/**
 * The cancel reason string emitted by contracts when an order is explicitly cancelled
 * via cancelOrder, as opposed to cancellation due to execution failure.
 *
 * - For market orders, keepers can only cancel via this path after `requestExpirationTime`
 *   has elapsed, so this reason effectively means the order expired.
 * - For limit/trigger orders, users can cancel immediately via this path at any time.
 */
export const USER_INITIATED_CANCEL = "USER_INITIATED_CANCEL";

export type PositionTradeAction = {
  type: "position";
  id: string;
  srcChainId?: number;
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
  sizeDeltaInTokens?: bigint;
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
  reasonBytes?: string;
  shouldUnwrapNativeToken: boolean;
  totalImpactUsd?: bigint;
  liquidationFeeAmount?: bigint;
  twapParams:
    | {
        twapGroupId: string;
        numberOfParts: number;
      }
    | undefined;
  timestamp: number;
  transactionHash: string;
};

export type SwapTradeAction = {
  type: "swap";
  id: string;
  srcChainId?: number;
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
  reasonBytes?: string;
  twapParams:
    | {
        twapGroupId: string;
        numberOfParts: number;
      }
    | undefined;

  timestamp: number;
  transactionHash: string;
};

export type TradeAction = PositionTradeAction | SwapTradeAction;

export function isPositionTradeAction(tradeAction: TradeAction): tradeAction is PositionTradeAction {
  return tradeAction.type === "position";
}

export function isSwapTradeAction(tradeAction: TradeAction): tradeAction is SwapTradeAction {
  return tradeAction.type === "swap";
}
