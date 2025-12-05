import { useMemo } from "react";

import { useSidecarOrders } from "./useSidecarOrders";

export function useSidecarEntries() {
  const { stopLoss, takeProfit } = useSidecarOrders();

  return useMemo(() => [...(stopLoss?.entries || []), ...(takeProfit?.entries || [])], [stopLoss, takeProfit]);
}
