import type { MarketInfo } from "sdk/utils/markets/types";
import { OrderType, type OrderInfo } from "sdk/utils/orders/types";
import type { TokenData } from "sdk/utils/tokens/types";

import type { OrderStatusTitleData } from "components/StatusNotification/getOrderStatusTitle";

import type { GmsolOrderAction, GmsolPositionOrderKind } from "../transactions/types";

const ORDER_TYPES: Record<GmsolPositionOrderKind, OrderType> = {
  MarketIncrease: OrderType.MarketIncrease,
  LimitIncrease: OrderType.LimitIncrease,
  MarketDecrease: OrderType.MarketDecrease,
  LimitDecrease: OrderType.LimitDecrease,
  StopLossDecrease: OrderType.StopLossDecrease,
};

export function getGmsolCreateOrderTitles(
  action: GmsolOrderAction,
  {
    marketInfo,
    collateralToken,
    payToken,
  }: { marketInfo: MarketInfo | undefined; collateralToken: TokenData | undefined; payToken?: TokenData }
): OrderStatusTitleData[] {
  if (action.type !== "create") return [];
  return action.orders.map((order) => ({
    txnType: "create",
    orderType: ORDER_TYPES[order.kind],
    isLong: order.isLong,
    isTwap: false,
    sizeDeltaUsd: order.sizeDeltaUsd,
    initialCollateralDeltaAmount: order.collateralDeltaAmount,
    minOutputAmount: order.minOutput,
    shouldUnwrapNativeToken: order.unwrapNative,
    marketInfo,
    initialCollateralToken: order.payToken === undefined ? collateralToken : payToken,
    targetCollateralToken: collateralToken,
  }));
}

// The fields getPendingUpdateOrder and getPendingCancelOrder give an EVM toast for the same order.
export function getGmsolOrderTitle(order: OrderInfo, txnType: "update" | "cancel"): OrderStatusTitleData {
  return {
    txnType,
    orderType: order.orderType,
    isLong: order.isLong,
    isTwap: order.isTwap,
    sizeDeltaUsd: order.sizeDeltaUsd,
    initialCollateralDeltaAmount: order.initialCollateralDeltaAmount,
    minOutputAmount: txnType === "update" ? order.minOutputAmount : 0n,
    shouldUnwrapNativeToken: false,
    marketInfo: "marketInfo" in order ? order.marketInfo : undefined,
    initialCollateralToken: order.initialCollateralToken,
    targetCollateralToken: order.targetCollateralToken,
  };
}
