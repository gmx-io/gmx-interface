import { getMarketClosingDate, isClosingMarket, isDelistingMarket } from "config/static/markets";
import { getIsUsdgPool } from "config/usdgPools";
import { formatMonthDay } from "lib/dates";
import { isLimitIncreaseOrderType, isStopIncreaseOrderType } from "sdk/utils/orders";
import type { OrderType } from "sdk/utils/orders/types";

import type { MarketInfo, MarketsInfoData } from "./types";
import { getMarketPoolName } from "./utils";

export type MarketClosingState = {
  closingDate: number;
  isClosed: boolean;
};

export type ClosingPool = MarketClosingState & {
  poolName: string;
  targetMarket: MarketInfo | undefined;
};

export function getMarketClosingState(
  chainId: number,
  marketAddress: string,
  now: number
): MarketClosingState | undefined {
  const closingDate = getMarketClosingDate(chainId, marketAddress);

  if (closingDate === undefined || isDelistingMarket(chainId, marketAddress)) {
    return undefined;
  }

  return { closingDate, isClosed: now >= closingDate };
}

export function getClosingMarketTarget(
  chainId: number,
  marketsInfoData: MarketsInfoData | undefined,
  closingMarket: Pick<MarketInfo, "indexTokenAddress">
): MarketInfo | undefined {
  return Object.values(marketsInfoData ?? {}).find(
    (market) =>
      !market.isSpotOnly &&
      !market.isDisabled &&
      market.indexTokenAddress === closingMarket.indexTokenAddress &&
      getIsUsdgPool(chainId, market) &&
      !isClosingMarket(chainId, market.marketTokenAddress) &&
      !isDelistingMarket(chainId, market.marketTokenAddress)
  );
}

export function getClosingPool(
  chainId: number,
  marketsInfoData: MarketsInfoData | undefined,
  marketInfo: MarketInfo,
  now: number
): ClosingPool | undefined {
  const closingState = getMarketClosingState(chainId, marketInfo.marketTokenAddress, now);

  if (!closingState) {
    return undefined;
  }

  return {
    ...closingState,
    poolName: getMarketPoolName(marketInfo),
    targetMarket: getClosingMarketTarget(chainId, marketsInfoData, marketInfo),
  };
}

export function getClosingPoolTargetName(closingPool: ClosingPool): string {
  return closingPool.targetMarket ? getMarketPoolName(closingPool.targetMarket) : "USDG";
}

export function getIsSizeIncreasePendingOrder(order: { orderType: OrderType; sizeDeltaUsd: bigint }): boolean {
  return (
    (isLimitIncreaseOrderType(order.orderType) || isStopIncreaseOrderType(order.orderType)) && order.sizeDeltaUsd > 0n
  );
}

export function formatMarketClosingDate(closingDate: number): string {
  return formatMonthDay(closingDate / 1000, { timezone: "utc" });
}
