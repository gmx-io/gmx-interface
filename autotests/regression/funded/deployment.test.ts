import assert from "node:assert/strict";
import { test } from "node:test";

import { fundedCases } from "./catalog";
import { missingFundedSelectors } from "./deployment";

test("deployment selector detection reports every missing selector without mistaking an unrelated order label", () => {
  const smoke = fundedCases.filter((c) => c.id === "smoke-refresh");
  for (const [source, cases, missing] of [
    ['gmx-account-balance lp-balance- staked-gmx {"data-qa":`order-${order.key}`}', fundedCases, []],
    ['gmx-account-balance lp-balance- staked-gmx {"data-qa":"order-"+order.key}', fundedCases, []],
    ['order- "data-qa":"other-row"', fundedCases, ["gmx-account-balance", "lp-balance-", "staked-gmx", "order rows"]],
    ["", smoke, []],
  ] as const)
    assert.deepEqual(missingFundedSelectors(source, cases), missing);
});
