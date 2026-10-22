import { useMemo } from "react";
import useSWR from "swr";

import { getIsUsdgToken } from "config/usdgPools";
import { isDecreaseOrderType } from "domain/synthetics/orders";
import { getSubsquidGraphClient } from "lib/indexers/clients";
import { isPositionTradeAction, TradeActionType, type TradeAction } from "sdk/utils/tradeHistory/types";

import { fetchSwapLegs, getSwapLegId, type LifecycleSwapLeg } from "./useLifecycleSettlement";

/** Full closes get their legs from the lifecycle settlement, so only partial USDG closes that swap need one */
export function getUsdgPartialCloseSwapLegId(chainId: number, tradeAction: TradeAction): string | undefined {
  if (
    !isPositionTradeAction(tradeAction) ||
    tradeAction.eventName !== TradeActionType.OrderExecuted ||
    !isDecreaseOrderType(tradeAction.orderType) ||
    tradeAction.sizeDeltaUsd === 0n ||
    tradeAction.positionSizeInUsd === 0n ||
    tradeAction.swapPath.length === 0 ||
    !getIsUsdgToken(chainId, tradeAction.initialCollateralToken.address)
  ) {
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
