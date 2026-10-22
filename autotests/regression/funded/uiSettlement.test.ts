import assert from "node:assert/strict";
import { test } from "node:test";

import { fundedOrderReceipt } from "./fundedReceipt";
import { address, marketAddress, weth } from "./fundedQuote";
import { verifyUiExecutionReceipt } from "./uiSettlement";

const key = `0x${"12".repeat(32)}` as const;
test("UI execution requires the owned key in a successful keeper receipt from EventEmitter", () => {
  const receipt = fundedOrderReceipt({
    account: address,
    market: marketAddress,
    keys: [key],
    eventName: "OrderExecuted",
  });
  verifyUiExecutionReceipt(receipt, key);
  assert.throws(() => verifyUiExecutionReceipt({ ...receipt, status: "reverted" }, key));
  assert.throws(() => verifyUiExecutionReceipt(receipt, `0x${"13".repeat(32)}`));
  assert.throws(() =>
    verifyUiExecutionReceipt({ ...receipt, logs: receipt.logs.map((log) => ({ ...log, address: weth.address })) }, key)
  );
  for (const eventName of ["OrderCreated", "OrderCancelled", "OrderFrozen"] as const) {
    assert.throws(() =>
      verifyUiExecutionReceipt(
        fundedOrderReceipt({ account: address, market: marketAddress, keys: [key], eventName }),
        key
      )
    );
  }
});
