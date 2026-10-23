import assert from "node:assert/strict";
import { getAddress, parseEventLogs, zeroHash, type Abi, type TransactionReceipt } from "viem";

import EventEmitter from "../../../sdk/src/abis/EventEmitter";
import { getContract } from "../../../sdk/src/configs/contracts";

export function orderEventKeys(
  receipt: TransactionReceipt,
  eventName: "OrderCreated" | "OrderCancelled",
  address: string,
  marketAddress?: string
) {
  assert.equal(receipt.status, "success", "Order receipt is not successful");
  const events = parseEventLogs({
    abi: EventEmitter as Abi,
    logs: receipt.logs.filter((log) => getAddress(log.address) === getAddress(getContract(42161, "EventEmitter"))),
    strict: true,
  });
  const keys = events
    .filter((event) => (event.args as { eventName?: string }).eventName === eventName)
    .map((event) => {
      const { topic1, eventData } = event.args as {
        topic1: string;
        eventData: {
          addressItems: { items: { key: string; value: string }[] };
          bytes32Items: { items: { key: string; value: string }[] };
        };
      };
      const account = eventData.addressItems.items.find((item) => item.key === "account")?.value;
      const market = eventData.addressItems.items.find((item) => item.key === "market")?.value;
      const key = eventData.bytes32Items.items.find((item) => item.key === "key")?.value;
      assert.ok(account && getAddress(account) === getAddress(address), "Order receipt belongs to another wallet");
      if (marketAddress)
        assert.ok(
          market && getAddress(market) === getAddress(marketAddress),
          "Order receipt belongs to another market"
        );
      assert.ok(key && key !== zeroHash && key === topic1, "Order receipt has no matching order key");
      return key;
    });
  assert.equal(new Set(keys).size, keys.length, "Order receipt contains duplicate keys");
  return keys;
}
