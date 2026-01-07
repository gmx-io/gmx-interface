import { useMemo } from "react";

import { selectTradeboxIsTPSLEnabled } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { useSidecarOrders } from "./useSidecarOrders";

export function useSidecarEntries() {
  const { stopLoss, takeProfit } = useSidecarOrders();
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled);

  return useMemo(() => {
    if (!isTpSlEnabled) {
      return [];
    }

    return [...(stopLoss?.entries || []), ...(takeProfit?.entries || [])];
  }, [isTpSlEnabled, stopLoss, takeProfit]);
}
