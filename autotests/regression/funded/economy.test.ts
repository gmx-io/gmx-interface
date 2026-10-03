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
import { chargedFees, readJournal, withWalletLock, writeJournal, type FundedJournal } from "./journal";

test("excess ETH cannot cover the USDC starting reserve", () => {
  const reserves = startingReserves({
    stableUsd: usd("16.6356"),
    nativeUsd: usd("80.6"),
    collateralUsd: usd("2.5"),
    profile: "economy",
  });
  assert.equal(reserves.sufficient, false);
  assert.deepEqual(reserves.requiredUsd, { USDC: usd("17.5"), ETH: usd("5") });
  assert.deepEqual(reserves.shortfallUsd, { USDC: usd("0.8644"), ETH: 0n });
});

for (const profile of ["economy", "glv"] as const) {
  test(`${profile} starting reserves accept the exact boundary and reject either asset one unit below`, () => {
    const stableUsd = usd(profile === "economy" ? "17.5" : "15");
    const nativeUsd = usd(profile === "economy" ? "5" : "13");
    const input = { stableUsd, nativeUsd, collateralUsd: usd("2.5"), profile };
    assert.equal(startingReserves(input).sufficient, true);
    for (const asset of ["stableUsd", "nativeUsd"] as const) {
      const reserves = startingReserves({ ...input, [asset]: input[asset] - 1n });
      assert.equal(reserves.sufficient, false);
      assert.equal(reserves.shortfallUsd[asset === "stableUsd" ? "USDC" : "ETH"], 1n);
    }
  });
}

test("GLV has a bounded opt-in profile; the default still rejects its keeper fees", () => {
  assert.throws(() => checkFeeBudget(0n, usd("3.3"), false), /Action fee/);
  assert.doesNotThrow(() => checkFeeBudget(0n, usd("3.3"), false, feePolicy("glv")));
  assert.doesNotThrow(() => checkFeeBudget(usd("3.3"), usd("3.3"), true, feePolicy("glv")));
  assert.throws(() => checkFeeBudget(usd("3.3"), USD, false, feePolicy("glv")), /Cleanup fee reserve/);
  assert.throws(() => checkFeeBudget(usd("7"), usd("1.01"), true, feePolicy("glv")), /Run fee budget/);
});

test("sizes above current collateral minimum and fees, without raising leverage to save collateral", () => {
  const result = affordablePosition({ minCollateralUsd: USD, minPositionSizeUsd: USD, openingCostsUsd: usd("0.48") });
  assert.equal(result.sizeUsd, 2n * USD);
  assert.equal(result.collateralUsd, usd("2.48"));
  assert(result.sizeUsd * 10_000n <= result.collateralUsd * economy.maxLeverageBps);
});

test("partial-close sizing respects the minimum of the remaining position", () => {
  const result = affordablePosition({
    minCollateralUsd: USD,
    minPositionSizeUsd: 3n * USD,
    openingCostsUsd: usd("0.1"),
    remainingParts: 2,
  });
  assert.equal(result.sizeUsd, 6n * USD);
  assert.equal(result.collateralUsd, usd("4.1"));
});

test("blocks markets whose minimums cannot fit the small-wallet budget", () => {
  assert.throws(() => affordablePosition({ minCollateralUsd: 5n * USD, minPositionSizeUsd: USD, openingCostsUsd: 0n }));
  assert.throws(() =>
    affordablePosition({ minCollateralUsd: USD, minPositionSizeUsd: 11n * USD, openingCostsUsd: 0n })
  );
  assert.throws(() => affordablePosition({ minCollateralUsd: 0n, minPositionSizeUsd: USD, openingCostsUsd: 0n }));
});

test("the opening budget cannot consume cleanup reserves; cleanup shares the same total cap", () => {
  checkFeeBudget(2n * USD, USD, false);
  assert.throws(() => checkFeeBudget(2n * USD, USD + 1n, false));
  assert.throws(() => checkFeeBudget(3n * USD, usd("0.01"), false));
  checkFeeBudget(4n * USD, USD, true);
  assert.throws(() => checkFeeBudget(5n * USD, 1n, true));
  assert.throws(() => checkFeeBudget(0n, 0n, false));
});

test("does not spend a swap fee on dust or a small ratio drift", () => {
  assert.equal(
    rebalancePlan({
      initialNativeUsd: 20n * USD,
      initialStableUsd: 80n * USD,
      nativeUsd: 19n * USD,
      stableUsd: 79n * USD,
    }).direction,
    "none"
  );
  assert.equal(
    rebalancePlan({
      initialNativeUsd: 20n * USD,
      initialStableUsd: 80n * USD,
      nativeUsd: 17n * USD,
      stableUsd: 83n * USD,
    }).direction,
    "none"
  );
});

test("restores the initial value ratio using the remaining capital, not the original dollar amounts", () => {
  const plan = rebalancePlan({
    initialNativeUsd: 20n * USD,
    initialStableUsd: 80n * USD,
    nativeUsd: 10n * USD,
    stableUsd: 80n * USD,
  });
  assert.equal(plan.direction, "buy-native");
  assert.equal(plan.amountUsd, 8n * USD);
});

test("an explicit 50/50 target uses remaining capital instead of the initial ratio", () => {
  const plan = rebalancePlan({
    initialNativeUsd: 80n * USD,
    initialStableUsd: 20n * USD,
    nativeUsd: 55n * USD,
    stableUsd: 39n * USD,
    targetNativeBps: 5_000n,
  });
  assert.equal(plan.direction, "sell-native");
  assert.equal(plan.amountUsd, 8n * USD);
  assert.deepEqual(plan.targetUsd, { ETH: 47n * USD, USDC: 47n * USD });
});

test("50/50 tolerates five percentage points and dust while retaining the $10 swap cap", () => {
  const initial = { initialNativeUsd: 50n * USD, initialStableUsd: 50n * USD, targetNativeBps: 5_000n };
  assert.equal(rebalancePlan({ ...initial, nativeUsd: 55n * USD, stableUsd: 45n * USD }).direction, "none");
  assert.equal(rebalancePlan({ ...initial, nativeUsd: 56n * USD, stableUsd: 44n * USD }).direction, "sell-native");
  assert.equal(rebalancePlan({ ...initial, nativeUsd: usd("9.9"), stableUsd: usd("6.1") }).direction, "none");
  const largeDrift = { ...initial, nativeUsd: 80n * USD, stableUsd: 20n * USD };
  assert.equal(rebalanceTarget(largeDrift).amountUsd, 30n * USD);
  assert.throws(() => rebalancePlan(largeDrift), /\$10 rebalance limit/);
  assert.throws(() => rebalanceTarget({ ...largeDrift, targetNativeBps: 10_001n }), /Invalid target/);
});

test("large drift and gas-reserve depletion require intervention instead of extra swaps", () => {
  assert.throws(() =>
    rebalancePlan({
      initialNativeUsd: 20n * USD,
      initialStableUsd: 80n * USD,
      nativeUsd: 50n * USD,
      stableUsd: 50n * USD,
    })
  );
  assert.throws(() =>
    rebalancePlan({ initialNativeUsd: USD, initialStableUsd: 99n * USD, nativeUsd: 8n * USD, stableUsd: 12n * USD })
  );
});

test("fee reservations and unresolved actions survive a fresh journal reader", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gmx-regression-test-"));
  try {
    const journal: FundedJournal = {
      version: 1,
      id: "test-run",
      chainId: 42161,
      address: "test-wallet",
      createdAt: new Date().toISOString(),
      initialNativeUsd: (20n * USD).toString(),
      initialStableUsd: (80n * USD).toString(),
      marketAddress: "market",
      ownedPositionKeys: [],
      ownedOrderKeys: [],
      completed: false,
      actions: [
        { id: "sent", purpose: "open", feeUsd: USD.toString(), requestId: "request", state: "pending" },
        { id: "failed", purpose: "approve", feeUsd: USD.toString(), state: "failed" },
      ],
    };
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
