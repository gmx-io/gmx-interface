import { useMemo } from "react";
import useSWR from "swr";

import { getIsUsdgToken } from "config/usdgPools";
import { isDecreaseOrderType } from "domain/synthetics/orders";
import { getSubsquidGraphClient } from "lib/indexers/clients";
import { isPositionTradeAction, TradeActionType, type TradeAction } from "sdk/utils/tradeHistory/types";

import { fetchSwapLegs, getSwapLegId, type LifecycleSwapLeg } from "./useLifecycleSettlement";

/** Full closes get their payout from the lifecycle settlement, so partial USDG closes name it on their own row */
export function getIsUsdgPartialClose(chainId: number, tradeAction: TradeAction): boolean {
  return (
    isPositionTradeAction(tradeAction) &&
    tradeAction.eventName === TradeActionType.OrderExecuted &&
    isDecreaseOrderType(tradeAction.orderType) &&
    tradeAction.sizeDeltaUsd !== 0n &&
    tradeAction.positionSizeInUsd !== 0n &&
    getIsUsdgToken(chainId, tradeAction.initialCollateralToken.address)
  );
}

/** Only partial USDG closes that swap need a leg to tell what they paid */
export function getUsdgPartialCloseSwapLegId(chainId: number, tradeAction: TradeAction): string | undefined {
  if (!getIsUsdgPartialClose(chainId, tradeAction) || tradeAction.swapPath.length === 0) {
    return undefined;
  }

  return getSwapLegId(tradeAction.orderKey, tradeAction.swapPath[tradeAction.swapPath.length - 1]);
}

/** Undefined until loaded: only a loaded result can tell a reverted swap (no leg) from a pending fetch */
export function useUsdgPartialCloseSwapLegs(
  chainId: number,
  tradeActions: TradeAction[]
): Record<string, LifecycleSwapLeg> | undefined {
  const swapInfoIds = useMemo(
    () =>
      tradeActions.flatMap((tradeAction) => {
        const swapLegId = getUsdgPartialCloseSwapLegId(chainId, tradeAction);

        return swapLegId === undefined ? [] : [swapLegId];
      }),
    [chainId, tradeActions]
  );

  const client = getSubsquidGraphClient(chainId);

  const { data } = useSWR(
    client && swapInfoIds.length > 0 ? ["usdgPartialCloseSwapLegs", chainId, swapInfoIds.join(",")] : null,
    async () => {
      const swapLegs = await fetchSwapLegs(client!, swapInfoIds);

      return Object.fromEntries(swapLegs.map((leg) => [getSwapLegId(leg.orderKey, leg.marketAddress), leg]));
    },
    { refreshInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  return data;
}
