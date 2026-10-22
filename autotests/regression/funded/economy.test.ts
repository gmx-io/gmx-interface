import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  affordablePosition,
  checkFeeBudget,
  economy,
  feePolicy,
  rebalancePlan,
  rebalanceTarget,
  startingReserves,
  USD,
  usd,
} from "./economy";
import { chargedFees, readJournal, withWalletLock, writeJournal } from "./journal";
import { testJournal } from "./testSession";

test("starting reserves are checked per asset at the exact boundary; surplus ETH cannot cover USDC", () => {
  for (const [profile, stableUsd, nativeUsd, shortfallUsd] of [
    ["economy", usd("16.6356"), usd("80.6"), { USDC: usd("0.8644"), ETH: 0n }],
    ["economy", usd("17.5"), usd("5"), { USDC: 0n, ETH: 0n }],
    ["economy", usd("17.5") - 1n, usd("5"), { USDC: 1n, ETH: 0n }],
    ["economy", usd("17.5"), usd("5") - 1n, { USDC: 0n, ETH: 1n }],
    ["glv", usd("15"), usd("13"), { USDC: 0n, ETH: 0n }],
    ["glv", usd("15") - 1n, usd("13"), { USDC: 1n, ETH: 0n }],
    ["glv", usd("15"), usd("13") - 1n, { USDC: 0n, ETH: 1n }],
  ] as const) {
    const reserves = startingReserves({ stableUsd, nativeUsd, collateralUsd: usd("2.5"), profile });
    assert.deepEqual(reserves.shortfallUsd, shortfallUsd);
    assert.equal(reserves.sufficient, shortfallUsd.USDC === 0n && shortfallUsd.ETH === 0n);
    assert.deepEqual(
      reserves.requiredUsd,
      profile === "economy" ? { USDC: usd("17.5"), ETH: usd("5") } : { USDC: usd("15"), ETH: usd("13") }
    );
  }
});

test("fee budgets keep the cleanup reserve and share one run cap; GLV is a bounded opt-in profile", () => {
  for (const [chargedUsd, quoteUsd, cleanup, policy, error] of [
    [2n * USD, USD, false, economy],
    [2n * USD, USD + 1n, false, economy, "Action fee exceeds $1 (estimated $1.000000000000000000000000000001)"],
    [3n * USD, usd("0.01"), false, economy, /Cleanup fee reserve/],
    [4n * USD, USD, true, economy],
    [5n * USD, 1n, true, economy, /Run fee budget/],
    [0n, 0n, false, economy, /Invalid fee accounting/],
    [0n, usd("3.3"), false, economy, /Action fee/],
    [0n, usd("3.3"), false, feePolicy("glv")],
    [usd("3.3"), usd("3.3"), true, feePolicy("glv")],
    [usd("3.3"), USD, false, feePolicy("glv"), /Cleanup fee reserve/],
    [usd("7"), usd("1.01"), true, feePolicy("glv"), /Run fee budget/],
  ] as const) {
    const check = () => checkFeeBudget(chargedUsd, quoteUsd, cleanup, policy);
    if (error === undefined) assert.doesNotThrow(check);
    else assert.throws(check, typeof error === "string" ? { message: error } : error);
  }
});

test("sizes above market minimums and fees without raising leverage, and blocks unaffordable markets", () => {
  for (const [minCollateralUsd, minPositionSizeUsd, openingCostsUsd, remainingParts, expected] of [
    [USD, USD, usd("0.48"), 1, { sizeUsd: 2n * USD, collateralUsd: usd("2.48") }],
    [USD, 3n * USD, usd("0.1"), 2, { sizeUsd: 6n * USD, collateralUsd: usd("4.1") }],
    [5n * USD, USD, 0n, 1],
    [USD, 11n * USD, 0n, 1],
    [0n, USD, 0n, 1],
  ] as const) {
    const size = () => affordablePosition({ minCollateralUsd, minPositionSizeUsd, openingCostsUsd, remainingParts });
    if (!expected) {
      assert.throws(size);
      continue;
    }
    const result = size();
    assert.deepEqual(result, expected);
    assert(result.sizeUsd * 10_000n <= result.collateralUsd * economy.maxLeverageBps);
  }
});

test("50/50 rebalancing skips dust and small drift and stops at the swap cap or reserves", () => {
  const plan = (nativeUsd: bigint, stableUsd: bigint) =>
    rebalancePlan({ nativeUsd, stableUsd, targetNativeBps: economy.targetNativeBps });
  for (const [nativeUsd, stableUsd, expected] of [
    [55n * USD, 45n * USD, "none"],
    [usd("9.9"), usd("6.1"), "none"],
    [56n * USD, 44n * USD, ["sell-native", 6n * USD]],
    [55n * USD, 39n * USD, ["sell-native", 8n * USD]],
    [40n * USD, 58n * USD, ["buy-native", 9n * USD]],
    [80n * USD, 20n * USD, /\$10 rebalance limit/],
    [8n * USD, usd("0.5"), /native gas reserve/],
    [8n * USD, 12n * USD, /stablecoin and cleanup reserves/],
  ] as const) {
    if (expected instanceof RegExp) {
      assert.throws(() => plan(nativeUsd, stableUsd), expected);
      continue;
    }
    const result = plan(nativeUsd, stableUsd);
    assert.equal(result.direction, expected === "none" ? "none" : expected[0]);
    if (expected !== "none") assert.equal(result.amountUsd, expected[1]);
  }
  assert.deepEqual(plan(55n * USD, 39n * USD).targetUsd, { ETH: 47n * USD, USDC: 47n * USD });
  const largeDrift = { nativeUsd: 80n * USD, stableUsd: 20n * USD, targetNativeBps: economy.targetNativeBps };
  assert.equal(rebalanceTarget(largeDrift).amountUsd, 30n * USD);
  assert.throws(() => rebalanceTarget({ ...largeDrift, targetNativeBps: 10_001n }), /Invalid target/);
});

test("fee reservations and unresolved actions survive a fresh journal reader", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gmx-regression-test-"));
  try {
    const journal = testJournal("test-wallet", {
      actions: [
        { id: "sent", purpose: "close", feeUsd: USD.toString(), requestId: "request", state: "pending" },
        { id: "failed", purpose: "approve", feeUsd: USD.toString(), state: "failed" },
      ],
    });
    await writeJournal(directory, journal);
    const reloaded = (await readJournal(directory))!;
    assert.equal(chargedFees(reloaded), 2n * USD);
    assert.equal(reloaded.actions[0].requestId, "request");
    assert.equal(reloaded.actions[0].state, "pending");
    assert(!/private|signature/i.test(await readFile(join(directory, "active.json"), "utf8")));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the wallet lock excludes another run and is released after a failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gmx-regression-test-"));
  try {
    await assert.rejects(
      withWalletLock(directory, async () => {
        await assert.rejects(
          withWalletLock(directory, async () => undefined),
          /locked/
        );
        throw new Error("test interrupted");
      }),
      /test interrupted/
    );
    await withWalletLock(directory, async () => undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
