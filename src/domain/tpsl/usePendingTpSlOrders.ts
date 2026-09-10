import { useEffect, useMemo } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId, selectOrdersInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { getPendingTpSlOrders } from "./pendingOrders";

export function usePendingTpSlOrders(positionKey: string | undefined) {
  const { pendingTpSlOrderBatches, setPendingTpSlOrderBatches, orderStatuses, relayTaskStatuses } =
    useSyntheticsEvents();
  const chainId = useSelector(selectChainId);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { pendingOrders, completedBatchIds, completedOrderKeys, batchUpdates } = useMemo(
    () =>
      getPendingTpSlOrders({
        batches: pendingTpSlOrderBatches,
        chainId,
        positionKey,
        ordersInfoData,
        orderStatuses,
        relayTaskStatuses,
      }),
    [pendingTpSlOrderBatches, chainId, positionKey, ordersInfoData, orderStatuses, relayTaskStatuses]
  );

  useEffect(() => {
    if (completedBatchIds.length > 0 || Object.keys(batchUpdates).length > 0) {
      setPendingTpSlOrderBatches((batches) =>
        batches
          .filter((batch) => !completedBatchIds.includes(batch.id))
          .map((batch) =>
            batch.chainId !== chainId
              ? batch
              : {
                  ...batch,
                  orders: batchUpdates[batch.id] ?? batch.orders,
                  existingOrderKeys: [...new Set([...batch.existingOrderKeys, ...completedOrderKeys])],
                }
          )
      );
    }
  }, [completedBatchIds, completedOrderKeys, batchUpdates, chainId, setPendingTpSlOrderBatches]);

  return pendingOrders;
}
