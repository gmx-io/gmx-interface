import assert from "node:assert/strict";
import { getAddress, parseEventLogs, type Abi, type TransactionReceipt } from "viem";

import EventEmitter from "../../../sdk/src/abis/EventEmitter";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { FundedAction } from "./journal";
import type { FundedSession } from "./session";
import { eventually } from "./trading";

export function verifyUiExecutionReceipt(receipt: TransactionReceipt, key: string) {
  assert.equal(receipt.status, "success", "Keeper transaction reverted");
  const events = parseEventLogs({
    abi: EventEmitter as Abi,
    logs: receipt.logs.filter((log) => getAddress(log.address) === getAddress(getContract(42161, "EventEmitter"))),
    strict: true,
  });
  assert.ok(
    events.some((event) => {
      const args = event.args as {
        eventName: string;
        topic1?: string;
        eventData: { bytes32Items: { items: { key: string; value: string }[] } };
      };
      return (
        args.eventName === "OrderExecuted" &&
        args.topic1 === key &&
        args.eventData.bytes32Items.items.some((item) => item.key === "key" && item.value === key)
      );
    }),
    "Keeper receipt does not prove execution of the owned UI order"
  );
}

export async function waitForUiExecution(session: FundedSession, action: FundedAction, selectedKey?: string) {
  assert.ok(action.uiOrder && action.orderKeys?.length, "Missing UI order creation evidence");
  assert.ok(selectedKey || action.orderKeys.length === 1, "Select the executed TWAP part explicitly");
  const key = selectedKey ?? action.orderKeys[0];
  assert.ok(action.orderKeys.includes(key));
  assert.ok(session.active.ownedOrderKeys.includes(key), "Cannot settle an unowned UI order");
  if (action.uiOrder.executionTxHashes?.length) return;
  // The indexer locates the keeper transaction; the receipt independently proves execution.
  const trade = await eventually(
    async () => {
      const result = await session.sdk.fetchTrades({
        address: getAddress(session.address),
        since: Math.floor(Date.parse(action.startedAt!) / 1000) - 60,
        actions: ["OrderExecuted", "OrderCancelled", "OrderFrozen"],
        limit: 100,
      });
      const trade = result.trades.find((entry) => entry.orderKey === key);
      if (trade && trade.eventName !== "OrderExecuted") throw new Error(`UI order ${trade.eventName}`);
      return trade;
    },
    (trade) => !!trade
  );
  assert.ok(trade && getAddress(trade.account) === getAddress(session.address));
  assert.match(trade.transactionHash, /^0x[\da-fA-F]{64}$/);
  const hash = trade.transactionHash as `0x${string}`;
  verifyUiExecutionReceipt(await session.rpc.getTransactionReceipt({ hash }), key);
  action.uiOrder.executionTxHashes = [hash];
  await session.save();
}
