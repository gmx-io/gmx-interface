import { useMemo } from "react";

import { useSidecarOrders } from "./useSidecarOrders";

export function useSidecarEntries() {
  const { limit, stopLoss, takeProfit } = useSidecarOrders();

  return useMemo(
    () => [...(stopLoss?.entries || []), ...(takeProfit?.entries || []), ...(limit?.entries || [])],
    [stopLoss, takeProfit, limit]
  );
}
