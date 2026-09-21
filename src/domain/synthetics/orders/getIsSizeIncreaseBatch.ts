import { isIncreaseOrderType } from "sdk/utils/orders";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

export function getIsSizeIncreaseBatch(batchParams: Pick<BatchOrderTxnParams, "createOrderParams">): boolean {
  return batchParams.createOrderParams.some(
    (p) => isIncreaseOrderType(p.orderPayload.orderType) && p.orderPayload.numbers.sizeDeltaUsd > 0n
  );
}
