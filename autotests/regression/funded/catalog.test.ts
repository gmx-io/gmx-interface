import assert from "node:assert/strict";
import { test } from "node:test";

import { fundedCases, selectFeeProfile, selectFundedCases } from "./catalog";

test("all selects every funded scenario once in a stable serial order", () => {
  const all = selectFundedCases(["--group", "all"]);
  assert.equal(all.length, 17);
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.deepEqual(all, fundedCases);
  for (const group of ["trading", "account", "bridge", "liquidity", "earn", "one-click"])
    assert.ok(all.some((scenario) => scenario.group === group));
});

test("default stays on the smoke; explicit selection can resume later cases without re-running earlier groups", () => {
  assert.deepEqual(
    selectFundedCases([]).map((c) => c.id),
    ["smoke-refresh"]
  );
  assert.deepEqual(
    selectFundedCases(["--execute", "--case", "glv,gm"]).map((c) => c.id),
    ["gm", "glv"]
  );
  assert.deepEqual(
    selectFundedCases(["--group", "liquidity,account"]).map((c) => c.id),
    ["account", "gm", "glv"]
  );
});

test("typos and ambiguous selection fail instead of spending on the default smoke", () => {
  for (const args of [
    ["--grop", "trading"],
    ["--group"],
    ["--group", "unknown"],
    ["--case", "typo"],
    ["--group", "trading", "--case", "gm"],
    ["--case", "--execute"],
  ])
    assert.throws(() => selectFundedCases(args));
});

test("the higher fee profile is explicit and cannot be applied to a group or all tests", () => {
  const glv = selectFundedCases(["--case", "glv"]);
  assert.equal(selectFeeProfile([], glv), "economy");
  assert.equal(selectFeeProfile(["--fee-profile", "glv"], glv), "glv");
  assert.throws(() => selectFeeProfile(["--fee-profile", "glv"], fundedCases));
  assert.throws(() => selectFeeProfile(["--fee-profile", "unlimited"], glv));
  assert.throws(() => selectFeeProfile(["--fee-profile"], glv));
});
