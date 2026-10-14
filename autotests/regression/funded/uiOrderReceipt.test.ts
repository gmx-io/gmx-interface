import assert from "node:assert/strict";
import { test } from "node:test";

import { fundedOrderReceipt } from "../fixtures/fundedReceipt";
import { address, marketAddress, weth } from "../fixtures/fundedQuote";
import type { FundedAction, FundedJournal } from "./journal";
import { registerUiOrderReceipt } from "./uiOrderReceipt";

const key = `0x${"12".repeat(32)}`;
function fixture(createdCount = 1) {
  const journal = { address, ownedOrderKeys: [], actions: [] } as unknown as FundedJournal;
  const action: FundedAction = {
    id: "ui",
    purpose: "ui:open",
    state: "pending",
    feeUsd: "0",
    uiOrder: { createdCount, marketAddress },
  };
  return { journal, action };
}

test("UI creation receipt establishes durable order ownership idempotently", () => {
  const { journal, action } = fixture();
  const receipt = fundedOrderReceipt({ account: address, market: marketAddress, keys: [key] });
  registerUiOrderReceipt(journal, action, receipt);
  registerUiOrderReceipt(journal, action, receipt);
  assert.deepEqual(journal.ownedOrderKeys, [key]);
  assert.deepEqual(action.orderKeys, [key]);
  assert.equal(action.state, "pending", "A creation receipt alone must not certify keeper execution");
});

test("UI receipt rejects wrong account, market, order count and changed order IDs", () => {
  for (const receipt of [
    fundedOrderReceipt({ account: weth.address, market: marketAddress, keys: [key] }),
    fundedOrderReceipt({ account: address, market: weth.address, keys: [key] }),
    fundedOrderReceipt({ account: address, market: marketAddress, keys: [] }),
    fundedOrderReceipt({ account: address, market: marketAddress, keys: [key, `0x${"13".repeat(32)}`] }),
  ]) {
    const { journal, action } = fixture();
    assert.throws(() => registerUiOrderReceipt(journal, action, receipt));
    assert.deepEqual(journal.ownedOrderKeys, []);
  }
  const { journal, action } = fixture();
  action.orderKeys = [`0x${"14".repeat(32)}`];
  assert.throws(() =>
    registerUiOrderReceipt(
      journal,
      action,
      fundedOrderReceipt({ account: address, market: marketAddress, keys: [key] })
    )
  );
});

test("UI cancellation requires the exact owned order and its cancellation event", () => {
  const { journal, action } = fixture(0);
  action.uiOrder!.cancelledKeys = [key];
  const receipt = fundedOrderReceipt({
    account: address,
    market: marketAddress,
    keys: [key],
    eventName: "OrderCancelled",
  });
  assert.throws(() => registerUiOrderReceipt(journal, action, receipt), /unowned/);
  journal.ownedOrderKeys = [key];
  registerUiOrderReceipt(journal, action, receipt);
  assert.deepEqual(action.cancelledOrderKeys, [key]);
  assert.throws(
    () =>
      registerUiOrderReceipt(
        journal,
        action,
        fundedOrderReceipt({ account: address, market: marketAddress, keys: [] })
      ),
    /cancellation receipt/
  );
});
