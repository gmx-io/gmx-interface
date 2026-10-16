import assert from "node:assert/strict";
import { test } from "node:test";

import { fundedCases } from "./catalog";
import { missingFundedSelectors } from "./deployment";

for (const orderSelector of ['"data-qa":`order-${order.key}`', '"data-qa":"order-"+order.key']) {
  test(`deployment selector detection supports ${orderSelector.includes("+") ? "concatenated" : "template"} compiled attributes`, () => {
    const source = `gmx-account-balance lp-balance- staked-gmx {${orderSelector}}`;
    assert.deepEqual(missingFundedSelectors(source, fundedCases), []);
  });
}

test("older deployment reports every missing selector and cannot mistake an unrelated order label for an order row", () => {
  assert.deepEqual(missingFundedSelectors('order- "data-qa":"other-row"', fundedCases), [
    "gmx-account-balance",
    "lp-balance-",
    "staked-gmx",
    "order rows",
  ]);
  assert.deepEqual(
    missingFundedSelectors(
      "",
      fundedCases.filter((c) => c.id === "smoke-refresh")
    ),
    []
  );
});
