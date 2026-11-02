import { isDecreaseOrderType } from "sdk/utils/orders";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

export function getIsDecreaseBatch(batchParams: Pick<BatchOrderTxnParams, "createOrderParams">): boolean {
  return (
    batchParams.createOrderParams.length > 0 &&
    batchParams.createOrderParams.every((p) => isDecreaseOrderType(p.orderPayload.orderType))
  );
}
