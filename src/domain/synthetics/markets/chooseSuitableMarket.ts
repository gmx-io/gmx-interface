import type { TokenOption } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import { TradeType } from "domain/synthetics/trade";

import { isMarketIndexToken } from "./utils";
import { isLimitOrderType, OrdersInfoData } from "../orders";
import { OrderInfo } from "../orders/types";

type PositionOrOrder = {
  size: bigint;
  marketAddress: string;
  collateralTokenAddress: string;
} & (
  | {
      type: "position";
      entity: PositionInfo;
    }
  | {
      type: "order";
      entity: OrderInfo;
    }
);

export function getLargestRelatedExistingPositionOrOrder({
  positionsInfo,
  ordersInfo,
  isLong,
  indexTokenAddress,
}: {
  positionsInfo: PositionsInfoData;
  ordersInfo: OrdersInfoData | undefined;
  isLong: boolean;
  indexTokenAddress: string;
}): PositionOrOrder | undefined {
  let largestRelatedExistingPositionOrOrder: PositionOrOrder | undefined = undefined;
  for (const position of Object.values(positionsInfo)) {
    if (position.isLong !== isLong) {
      continue;
    }

    if (!isMarketIndexToken({ indexToken: position.indexToken }, indexTokenAddress)) {
      continue;
    }

    if (!largestRelatedExistingPositionOrOrder || position.sizeInUsd > largestRelatedExistingPositionOrOrder.size) {
      largestRelatedExistingPositionOrOrder = {
        type: "position",
        size: position.sizeInUsd,
        entity: position,
        marketAddress: position.marketAddress,
        collateralTokenAddress: position.collateralTokenAddress,
      };
    }
  }

  const matchingOrders = Object.values(ordersInfo ?? {}).filter((order) => {
    return (
      isLimitOrderType(order.orderType) &&
      order.isLong === isLong &&
      "indexToken" in order &&
      order.indexToken &&
      isMarketIndexToken({ indexToken: order.indexToken }, indexTokenAddress)
    );
  });

  matchingOrders.forEach((order) => {
    if (!largestRelatedExistingPositionOrOrder || order.sizeDeltaUsd > largestRelatedExistingPositionOrOrder.size) {
      largestRelatedExistingPositionOrOrder = {
        type: "order",
        size: order.sizeDeltaUsd,
        entity: order,
        marketAddress: order.marketAddress,
        collateralTokenAddress: order.initialCollateralTokenAddress,
      };
      return;
    }
  });

  return largestRelatedExistingPositionOrOrder;
}

export type PreferredTradeTypePickStrategy = TradeType | "largestPosition";

export function chooseSuitableMarket({
  indexTokenAddress,
  maxLongLiquidityPool,
  maxShortLiquidityPool,
  isSwap,
  positionsInfo,
  ordersInfo,
  preferredTradeType,
  currentTradeType,
}: {
  indexTokenAddress: string;
  maxLongLiquidityPool?: TokenOption;
  maxShortLiquidityPool?: TokenOption;
  isSwap?: boolean;
  positionsInfo?: PositionsInfoData;
  ordersInfo?: OrdersInfoData;
  preferredTradeType: PreferredTradeTypePickStrategy;
  currentTradeType?: TradeType;
}):
  | { indexTokenAddress: string; marketTokenAddress?: string; tradeType: TradeType; collateralTokenAddress?: string }
  | undefined {
  if (isSwap) {
    return {
      indexTokenAddress,
      tradeType: TradeType.Swap,
    };
  }
  const maxLiquidtyPool = preferredTradeType === TradeType.Long ? maxLongLiquidityPool : maxShortLiquidityPool;

  if (preferredTradeType === "largestPosition" && positionsInfo) {
    let largestLongPositionOrOrder = getLargestRelatedExistingPositionOrOrder({
      positionsInfo,
      ordersInfo,
      isLong: true,
      indexTokenAddress,
    });

    let largestShortPositionOrOrder = getLargestRelatedExistingPositionOrOrder({
      positionsInfo,
      ordersInfo,
      isLong: false,
      indexTokenAddress,
    });

    if (!largestLongPositionOrOrder && !largestShortPositionOrOrder) {
      let marketTokenAddress = maxLiquidtyPool?.marketTokenAddress;

      if (!marketTokenAddress) {
        return undefined;
      }

      return {
        indexTokenAddress,
        marketTokenAddress: marketTokenAddress,
        tradeType: currentTradeType ?? TradeType.Long,
      };
    }

    let largestPositionOrOrder: PositionOrOrder | undefined = undefined;
    if (largestLongPositionOrOrder && largestShortPositionOrOrder) {
      largestPositionOrOrder =
        largestLongPositionOrOrder.size > largestShortPositionOrOrder.size
          ? largestLongPositionOrOrder
          : largestShortPositionOrOrder;
    } else {
      largestPositionOrOrder = largestLongPositionOrOrder || largestShortPositionOrOrder;
    }

    const largestPositionTradeType = largestPositionOrOrder?.entity.isLong ? TradeType.Long : TradeType.Short;

    return {
      indexTokenAddress,
      marketTokenAddress: largestPositionOrOrder?.marketAddress,
      tradeType: largestPositionTradeType,
      collateralTokenAddress: largestPositionOrOrder?.collateralTokenAddress,
    };
  } else if (preferredTradeType === "largestPosition") {
    if (!maxLongLiquidityPool) {
      return undefined;
    }

    return {
      indexTokenAddress,
      marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
      tradeType: TradeType.Long,
    };
  }

  const largestPositionOrOrder =
    positionsInfo &&
    getLargestRelatedExistingPositionOrOrder({
      positionsInfo,
      ordersInfo,
      isLong: preferredTradeType === TradeType.Long,
      indexTokenAddress,
    });

  const marketAddress = largestPositionOrOrder?.marketAddress ?? maxLiquidtyPool?.marketTokenAddress;

  if (!marketAddress) {
    return undefined;
  }

  return {
    indexTokenAddress,
    marketTokenAddress: marketAddress,
    tradeType: preferredTradeType,
    collateralTokenAddress: largestPositionOrOrder?.collateralTokenAddress,
  };
}
