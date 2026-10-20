import assert from "node:assert/strict";
import type { TransactionReceipt } from "viem";

import type { FundedAction, FundedJournal } from "./journal";
import { orderEventKeys } from "./orderReceipt";

export function registerUiOrderReceipt(journal: FundedJournal, action: FundedAction, receipt: TransactionReceipt) {
  assert.ok(action.uiOrder, "Missing UI order evidence requirements");
  const { createdCount, marketAddress, cancelledKeys = [] } = action.uiOrder;
  const created = orderEventKeys(receipt, "OrderCreated", journal.address, marketAddress);
  assert.equal(created.length, createdCount, "UI transaction created an unexpected number of orders");
  if (action.orderKeys) assert.deepEqual(action.orderKeys, created);
  action.orderKeys = created;
  for (const key of created) if (!journal.ownedOrderKeys.includes(key)) journal.ownedOrderKeys.push(key);
  const cancelled = orderEventKeys(receipt, "OrderCancelled", journal.address);
  assert.deepEqual([...cancelled].sort(), [...cancelledKeys].sort(), "UI cancellation receipt differs from intent");
  assert.ok(
    cancelled.every((key) => journal.ownedOrderKeys.includes(key)),
    "UI transaction cancelled an unowned order"
  );
}
