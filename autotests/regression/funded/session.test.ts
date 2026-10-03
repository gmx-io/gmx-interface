import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { hashedPositionKey } from "../../../sdk/src/configs/dataStore";
import { HttpError } from "../../../sdk/src/utils/http/http";
import { getPositionKey } from "../../../sdk/src/utils/positions/utils";
import { USD, usd, type FeeProfile } from "./economy";
import { readJournal, writeJournal, type FundedJournal } from "./journal";
import { FundedSession } from "./session";
import { depositAccount, withdrawAccount } from "./account";
import { depositBridge } from "./bridge";
import { claimRewards, stake, unstake } from "./earn";
import { withdrawLiquidity } from "./liquidity";
import { changePosition } from "./trading";

for (const profile of ["economy", "glv"] as const) {
  test(`${profile} plan explains a reserve rejection without replacing the completed journal`, async () => {
    const fixture = await setup(profile);
    try {
      const { session, journal, directory } = fixture;
      journal.completed = true;
      await writeJournal(directory, journal);
      const requiredStable = usd(profile === "economy" ? "17.5" : "15");
      const requiredNative = usd(profile === "economy" ? "5" : "13");
      const state = {
        positions: [],
        orders: [],
        onchainPositionCount: 0,
        onchainOrderCount: 0,
        wrappedAmount: 0n,
        stableAmount: 0n,
        nativeAmount: 0n,
        market: { marketTokenAddress: journal.marketAddress },
        stableUsd: requiredStable - usd("0.8644"),
        nativeUsd: requiredNative,
      };
      session.snapshot = async () => state as never;
      session.quoteIncrease = async () =>
        ({ sizeUsd: 2n * USD, collateralUsd: usd("2.5"), feeUsd: usd("0.5") }) as never;
      const plan = await session.plan();
      assert.equal(plan.startingReserves.sufficient, false);
      assert.deepEqual(plan.startingReserves.shortfallUsd, { USDC: "0.8644", ETH: "0" });
      assert.deepEqual(
        plan.startingReserves.requiredUsd,
        profile === "economy" ? { USDC: "17.5", ETH: "5" } : { USDC: "15", ETH: "13" }
      );
      await assert.rejects(session.begin(), /USDC: available .*required .*short by \$0\.87/);
      assert.deepEqual(await readJournal(directory), journal);
      state.stableUsd = requiredStable;
      state.nativeUsd = requiredStable;
      assert.equal((await session.plan()).startingReserves.sufficient, true);
      assert.notEqual(await session.begin(), journal.id);
      assert.equal(session.active.targetNativeBps, "5000");
      assert.deepEqual(session.active.actions, []);
    } finally {
      await fixture.dispose();
    }
  });
}

test("an adequately funded but unbalanced wallet is stopped before a new journal is created", async () => {
  const fixture = await setup();
  try {
    const { session, journal, directory } = fixture;
    journal.completed = true;
    await writeJournal(directory, journal);
    session.snapshot = async () =>
      ({
        positions: [],
        orders: [],
        onchainPositionCount: 0,
        onchainOrderCount: 0,
        wrappedAmount: 0n,
        stableUsd: 20n * USD,
        nativeUsd: 80n * USD,
      }) as never;
    session.quoteIncrease = async () => ({ sizeUsd: 2n * USD, collateralUsd: usd("2.5"), feeUsd: usd("0.5") }) as never;
    const plan = await session.plan();
    assert.equal(plan.startingReserves.sufficient, true);
    assert.deepEqual(plan.allocation.targetPercent, { ETH: 50, USDC: 50 });
    assert.deepEqual(plan.allocation.targetUsd, { ETH: "50", USDC: "50" });
    assert.equal(plan.allocation.withinTolerance, false);
    assert.deepEqual(plan.allocation.adjustment, { direction: "sell-native", amountUsd: "30" });
    await assert.rejects(session.begin(), /50\/50 ETH\/USDC/);
    assert.deepEqual(await readJournal(directory), journal);
  } finally {
    await fixture.dispose();
  }
});

for (const buying of [false, true]) {
  test(`cleanup ${buying ? "buys" : "sells"} ETH to the persisted 50/50 target after restart`, async () => {
    const fixture = await setup();
    try {
      const { session, journal, directory } = fixture;
      journal.targetNativeBps = "5000";
      await writeJournal(directory, journal);
      const state = {
        positions: [],
        orders: [],
        onchainPositionCount: 0,
        onchainOrderCount: 0,
        wrappedAmount: 0n,
        nativeUsd: (buying ? 42n : 58n) * USD,
        stableUsd: (buying ? 58n : 42n) * USD,
        weth: {
          address: "0x3333333333333333333333333333333333333333",
          decimals: 18,
          prices: { minPrice: 2000n * USD, maxPrice: 2000n * USD },
        },
        usdc: {
          address: "0x4444444444444444444444444444444444444444",
          decimals: 6,
          prices: { minPrice: USD, maxPrice: USD },
        },
      };
      session.snapshot = async () => state as never;
      const amount = buying ? 8_000_000n : 4_000_000_000_000_000n;
      let wraps = 0;
      session.nativeTransaction = async (request, purpose, cleanup) => {
        assert.equal(purpose, "wrap");
        assert.equal(buying, false);
        assert.equal(cleanup, true);
        assert.equal(request.value, amount);
        state.wrappedAmount = amount;
        wraps++;
        return {} as never;
      };
      session.allowance = async (_token, requestedAmount, cleanup) => {
        assert.equal(requestedAmount, amount + (buying ? 1_000_000n : 0n));
        assert.equal(cleanup, true);
      };
      session.quoteSwap = async (_state, requestedAmount, requestedBuying, unwrapNative) => {
        assert.equal(requestedAmount, amount);
        assert.equal(requestedBuying, buying);
        return {
          prepared: {} as never,
          feeUsd: USD / 2n,
          intent: {
            kind: "swap",
            tokenIn: (buying ? state.usdc : state.weth).address,
            amount,
            minOutputAmount: 0n,
            unwrapNative,
          },
        };
      };
      let swaps = 0;
      session.execute = async (_prepared, intent, purpose, cleanup) => {
        assert.equal(purpose, "rebalance");
        assert.equal(cleanup, true);
        assert.equal(intent.kind, "swap");
        assert("amount" in intent);
        assert.equal(intent.amount, amount);
        state.nativeUsd = 50n * USD;
        state.stableUsd = 50n * USD;
        state.wrappedAmount = 0n;
        swaps++;
        return {} as never;
      };
      const result = await session.cleanup(true);
      assert.equal(result.completed, true);
      assert.equal(swaps, 1);
      assert.equal(wraps, buying ? 0 : 1);
      assert.equal((await readJournal(directory))!.targetNativeBps, "5000");
      assert.equal((await readJournal(directory))!.initialNativeUsd, journal.initialNativeUsd);
      await session.cleanup(true);
      assert.equal(swaps, 1);
    } finally {
      await fixture.dispose();
    }
  });
}

for (const isLong of [true, false]) {
  for (const operation of ["deposit", "withdraw"] as const) {
    test(`collateral ${operation} on ${isLong ? "long" : "short"} uses the contract key and survives a UI retry without resubmission`, async () => {
      const fixture = await setup();
      try {
        const { session } = fixture;
        const market = session.active.marketAddress;
        const token = "0x3333333333333333333333333333333333333333";
        const key = getPositionKey(session.address, market, token, isLong);
        const contractKey = hashedPositionKey(session.address, market, token, isLong);
        const current = {
          key,
          contractKey,
          account: session.address,
          marketAddress: market,
          collateralTokenAddress: token,
          isLong,
          sizeInUsd: 3n * USD,
          collateralUsd: 3n * USD,
          collateralAmount: 3_000_000n,
        };
        const stepId = `market-${isLong ? "long" : "short"}:${operation}`;
        session.active.ownedPositionKeys = [key];
        session.snapshot = async () =>
          ({
            positions: [structuredClone(current)],
            orders: [],
            onchainPositionCount: 1,
            onchainOrderCount: 0,
            market: { marketTokenAddress: market },
            usdc: { address: token },
          }) as never;
        let prepares = 0;
        let submissions = 0;
        session.sdk.prepareCollateral = async (request) => {
          // The API indexes positions by their contract hash, not the UI key.
          if (request.positionKey !== contractKey)
            throw new HttpError(400, "HTTP 400: Position not found", {
              message: `Position not found: ${request.positionKey}`,
            });
          prepares++;
          assert.equal(request.operation, operation);
          assert.equal(request.amount, 250_000n);
          return { requestId: "collateral-quote" } as never;
        };
        session.execute = async (_prepared, intent, purpose, cleanup) => {
          submissions++;
          assert.equal(intent.kind, operation === "deposit" ? "increase" : "close");
          assert("sizeUsd" in intent && "collateralAmount" in intent);
          assert.equal(intent.sizeUsd, 0n);
          assert.equal(intent.collateralAmount, 250_000n);
          assert.equal(cleanup, false);
          current.collateralAmount += operation === "deposit" ? 250_000n : -250_000n;
          const action = {
            id: "collateral",
            purpose,
            step: stepId,
            state: "settled" as const,
            feeUsd: (USD / 2n).toString(),
          };
          session.active.actions.push(action);
          await session.save();
          return action;
        };
        let failUi = true;
        const run = () =>
          session.step(stepId, async () => {
            const size = await changePosition(session, operation);
            if (failUi) {
              failUi = false;
              throw new Error("UI assertion failed after settlement");
            }
            return size;
          });
        await assert.rejects(run(), /UI assertion failed after settlement/);
        await session.resume("run");
        assert.equal(await run(), 3n * USD);
        assert.equal(prepares, 1);
        assert.equal(submissions, 1);
        assert.equal(session.active.actions.length, 1);
      } finally {
        await fixture.dispose();
      }
    });
  }
}

test("account withdrawal retries still verify destination funds after the account becomes empty", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.active.inventory = { accountBaseline: "0", accountAmount: "1000000" };
    let account = 1_000_000n;
    let stableAmount = 10_000_000n;
    let submissions = 0;
    session.snapshot = async () =>
      ({ usdc: { address: "0x3333333333333333333333333333333333333333" }, stableAmount }) as never;
    session.rpc.readContract = async () => account as never;
    session.sdk.buildSameChainWithdrawBridgeOutParams = () => ({}) as never;
    session.sdk.buildSameChainWithdrawTxn = () => ({}) as never;
    session.nativeTransaction = async () => {
      submissions++;
      account = 0n;
      return {} as never;
    };
    const run = () => session.step("account:withdraw", () => withdrawAccount(session));
    await assert.rejects(run(), /did not reach the wallet/);
    await session.resume("run");
    await assert.rejects(run(), /did not reach the wallet/);
    stableAmount += 1_000_000n;
    await run();
    assert.equal(submissions, 1);
  } finally {
    await fixture.dispose();
  }
});

test("an unstake retry verifies returned GMX even if the stake is already empty", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.active.inventory = { stakeAmount: "100", stakeWalletBaseline: "1000" };
    let wallet = 900n;
    session.rpc.readContract = async (args) => (args.functionName === "balanceOf" ? wallet : 0n) as never;
    session.nativeTransaction = async () => {
      throw new Error("Must not send again");
    };
    await assert.rejects(unstake(session), /900n !== 1000n/);
    wallet = 1_000n;
    await unstake(session);
  } finally {
    await fixture.dispose();
  }
});

test("reverted LP creation does not require a nonexistent creation event during cleanup", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.active.inventory = { gmToken: "0x3333333333333333333333333333333333333333" };
    session.active.actions.push({ id: "reverted", purpose: "gm-deposit", state: "failed", feeUsd: "1" });
    session.rpc.readContract = async () => 0n as never;
    session.rpc.getTransactionReceipt = async () => {
      throw new Error("A reverted transaction has no deposit event");
    };
    await withdrawLiquidity(session, "gm", true);
  } finally {
    await fixture.dispose();
  }
});

test("an LP withdrawal retry cannot pass with burned LP but missing withdrawal outputs", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.active.inventory = {
      gmToken: "0x3333333333333333333333333333333333333333",
      gmWithdrawalOutputs: JSON.stringify({ wrappedAmount: "10", stableAmount: "200" }),
    };
    let wrappedAmount = 0n;
    session.rpc.readContract = async () => 0n as never;
    session.snapshot = async () => ({ wrappedAmount, stableAmount: 200n }) as never;
    await assert.rejects(withdrawLiquidity(session, "gm"), /did not reach the wallet/);
    wrappedAmount = 10n;
    await withdrawLiquidity(session, "gm");
  } finally {
    await fixture.dispose();
  }
});

test("cleanup restores the recorded GLV fee profile after a process restart", async () => {
  const fixture = await setup();
  try {
    fixture.journal.feeProfile = "glv";
    await writeJournal(fixture.directory, fixture.journal);
    await fixture.session.resume("run");
    assert.equal(fixture.session.feePolicy.runFeeLimitUsd, 8n * USD);
    assert.equal(fixture.session.feePolicy.cleanupReserveUsd, 4n * USD);
    assert.equal(fixture.session.feePolicy.actionFeeLimitUsd, 4n * USD);
  } finally {
    await fixture.dispose();
  }
});

test("missing GMX, claim entitlements and source-chain funds block without signing or submitting", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.snapshot = async () =>
      ({
        usdc: { address: "0x3333333333333333333333333333333333333333" },
        weth: { prices: { maxPrice: 2_000n * USD } },
        wrappedAmount: 0n,
      }) as never;
    session.rpc.readContract = async () => 0n as never;
    session.sourceRpc.readContract = async () => 0n as never;
    session.sdk.fetchTokensData = async () => [];
    session.nativeTransaction = async () => {
      throw new Error("Must not send a transaction");
    };
    await assert.rejects(stake(session), /BLOCKED: staking requires/);
    await assert.rejects(claimRewards(session), /BLOCKED: this wallet has no/);
    await assert.rejects(depositBridge(session), /BLOCKED: bridge requires/);
    assert.deepEqual(session.active.actions, []);
  } finally {
    await fixture.dispose();
  }
});

test("same-chain funding refuses pre-existing GMX Account inventory", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.snapshot = async () => ({ usdc: { address: "0x3333333333333333333333333333333333333333" } }) as never;
    session.rpc.readContract = async () => 1_000_000n as never;
    session.nativeTransaction = async () => {
      throw new Error("Must not send a transaction");
    };
    await assert.rejects(depositAccount(session), /empty GMX Account/);
    assert.deepEqual(session.active.actions, []);
  } finally {
    await fixture.dispose();
  }
});

test("completed checkpoints survive process restart and preserve bigint results", async () => {
  const fixture = await setup();
  try {
    let calls = 0;
    const result = await fixture.session.step("gm:deposit", async () => {
      calls++;
      return { amount: 42n };
    });
    assert.equal(result.amount, 42n);
    await fixture.session.resume("run");
    assert.deepEqual(
      await fixture.session.step("gm:deposit", async () => {
        calls++;
        return { amount: 99n };
      }),
      result
    );
    assert.equal(calls, 1);
  } finally {
    await fixture.dispose();
  }
});

test("a UI assertion retry recovers the same paid action and original balance snapshot", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    let submissions = 0;
    let balance = 10n;
    const action = async () => {
      const before = await session.remember("balance", async () => balance);
      if (!(await session.previousAction("deposit"))) {
        submissions++;
        balance--;
        session.active.actions.push({
          id: "tx",
          purpose: "deposit",
          step: "account:deposit",
          state: "settled",
          feeUsd: USD.toString(),
        });
        await session.save();
        throw new Error("UI not indexed yet");
      }
      assert.equal(before, 10n);
      assert.equal(balance, 9n);
      return balance;
    };
    await assert.rejects(session.step("account:deposit", action), /UI not indexed/);
    await session.resume("run");
    assert.equal(await session.step("account:deposit", action), 9n);
    assert.equal(submissions, 1);
  } finally {
    await fixture.dispose();
  }
});

test("failed paid actions cannot be resubmitted by a Playwright retry", async () => {
  const fixture = await setup();
  try {
    fixture.session.active.actions.push({
      id: "failed",
      purpose: "swap",
      step: "swap:buy",
      state: "failed",
      feeUsd: USD.toString(),
    });
    await fixture.session.save();
    await assert.rejects(
      fixture.session.step("swap:buy", () => fixture.session.previousAction("swap")),
      /cannot submit/
    );
    assert.equal(fixture.session.active.actions.length, 1);
  } finally {
    await fixture.dispose();
  }
});

test("cleaning between scenarios keeps the original ratio, journal, checkpoints and accumulated fees", async () => {
  const fixture = await setup();
  try {
    fixture.session.active.actions.push({ id: "prior", purpose: "close", state: "settled", feeUsd: USD.toString() });
    fixture.session.snapshot = async () =>
      ({
        positions: [],
        orders: [],
        wrappedAmount: 0n,
        nativeUsd: 20n * USD,
        stableUsd: 79n * USD,
        onchainPositionCount: 0,
        onchainOrderCount: 0,
      }) as never;
    await fixture.session.step("market-long:cleanup", () => fixture.session.cleanup(true, false));
    const saved = (await readJournal(fixture.directory))!;
    assert.equal(saved.completed, false);
    assert.equal(saved.actions.length, 1);
    assert.equal(saved.initialStableUsd, (80n * USD).toString());
    assert.ok(saved.checkpoints?.["market-long:cleanup"].finishedAt);
  } finally {
    await fixture.dispose();
  }
});

async function setupRebalance(nativeUsd = 58n * USD, stableUsd = 42n * USD, wrappedAmount = 0n) {
  const fixture = await setup();
  const { session, journal, directory } = fixture;
  journal.targetNativeBps = "5000";
  await writeJournal(directory, journal);
  await session.resume(journal.id);
  const state = {
    nativeUsd,
    stableUsd,
    wrappedAmount,
    positions: [],
    orders: [],
    onchainPositionCount: 0,
    onchainOrderCount: 0,
    market: { marketTokenAddress: journal.marketAddress },
    weth: {
      address: "0x3333333333333333333333333333333333333333",
      decimals: 18,
      prices: { minPrice: 2_000n * USD, maxPrice: 2_000n * USD },
    },
    usdc: {
      address: "0x4444444444444444444444444444444444444444",
      decimals: 6,
      prices: { minPrice: USD, maxPrice: USD },
    },
  };
  const calls: string[] = [];
  session.snapshot = async () => state as never;
  session.quoteSwap = async (_state, amount, buying, unwrapNative) => ({
    prepared: {} as never,
    feeUsd: USD / 2n,
    intent: {
      kind: "swap",
      tokenIn: buying ? state.usdc.address : state.weth.address,
      amount,
      minOutputAmount: 0n,
      unwrapNative,
    },
  });
  session.allowance = async () => {
    calls.push("approve");
  };
  const record = async (purpose: string, phase: string, feeUsd: bigint) => {
    const action = {
      id: `action-${session.active.actions.length}`,
      purpose,
      state: "settled" as const,
      step: `${session.active.balanceCleanupId}:${phase}`,
      feeUsd: feeUsd.toString(),
    };
    session.active.actions.push(action);
    await session.save();
    return action;
  };
  session.nativeTransaction = async (request, purpose) => {
    calls.push(purpose);
    if (purpose === "wrap") {
      state.nativeUsd -= (request.value * 2_000n * USD) / 10n ** 18n;
      state.wrappedAmount += request.value;
    } else {
      assert.equal(purpose, "unwrap");
      state.nativeUsd += (state.wrappedAmount * 2_000n * USD) / 10n ** 18n;
      state.wrappedAmount = 0n;
    }
    return record(purpose, purpose === "wrap" ? "rebalance" : "unwrap", USD / 100n);
  };
  session.execute = async (_prepared, intent, purpose) => {
    assert.equal(purpose, "rebalance");
    assert.equal(intent.kind, "swap");
    assert("amount" in intent && "tokenIn" in intent);
    calls.push("swap");
    if (intent.tokenIn === state.usdc.address) {
      const valueUsd = (intent.amount * USD) / 10n ** 6n;
      state.stableUsd -= valueUsd;
      state.nativeUsd += valueUsd;
    } else {
      assert(state.wrappedAmount >= intent.amount);
      state.wrappedAmount -= intent.amount;
      state.stableUsd += (intent.amount * 2_000n * USD) / 10n ** 18n;
    }
    return record(purpose, "rebalance", USD / 2n);
  };
  return { ...fixture, state, calls };
}

for (const failure of ["quote", "budget"] as const) {
  test(`cleanup rejects an invalid ${failure} before wrapping, approving or unwrapping on any retry`, async () => {
    const fixture = await setupRebalance();
    try {
      const quote = fixture.session.quoteSwap;
      fixture.session.quoteSwap = async (...args) => {
        if (failure === "quote") throw new Error("Prepared order differs from the permitted economy action");
        return { ...(await quote(...args)), feeUsd: 2n * USD };
      };
      for (let attempt = 0; attempt < 3; attempt++) {
        await assert.rejects(
          fixture.session.cleanup(true),
          failure === "quote" ? /Prepared order differs/ : /Action fee exceeds/
        );
        assert.deepEqual(fixture.calls, []);
        assert.equal((await readJournal(fixture.directory))!.completed, false);
      }
    } finally {
      await fixture.dispose();
    }
  });
}

test("cleanup reuses leftover WETH from the old failed rebalance instead of unwrapping and wrapping it", async () => {
  const fixture = await setupRebalance(50n * USD, 42n * USD, 4_000_000_000_000_000n);
  try {
    fixture.session.active.actions.push(
      ...["unwrap", "wrap"].map((purpose) => ({
        id: `legacy-${purpose}`,
        purpose,
        state: "settled" as const,
        step: "market-long:cleanup",
        feeUsd: "1",
      }))
    );
    await fixture.session.save();
    await fixture.session.step("market-long:cleanup", () => fixture.session.cleanup(true, false));
    const result = await fixture.session.cleanup(true);
    assert.equal(result.completed, true);
    assert.deepEqual(fixture.calls, ["approve", "swap"]);
    assert.equal(fixture.state.nativeUsd, 50n * USD);
    assert.equal(fixture.state.stableUsd, 50n * USD);
    assert.equal(fixture.state.wrappedAmount, 0n);
  } finally {
    await fixture.dispose();
  }
});

test("cleanup resumes the same wrap and amount after a swap preparation or submission failure", async () => {
  const fixture = await setupRebalance();
  try {
    const execute = fixture.session.execute;
    fixture.session.execute = async () => {
      throw new Error("Rejected before signing");
    };
    await assert.rejects(fixture.session.cleanup(true, false), /Rejected before signing/);
    const saved = (await readJournal(fixture.directory))!;
    assert.ok(saved.balanceCleanupId);
    assert.deepEqual(fixture.calls, ["wrap", "approve"]);
    fixture.session.execute = execute;
    await fixture.session.resume(saved.id);
    assert.equal((await fixture.session.cleanup(true)).completed, true);
    assert.equal(fixture.calls.filter((c) => c === "wrap").length, 1);
    assert.equal(fixture.calls.filter((c) => c === "swap").length, 1);
    assert.equal(fixture.calls.filter((c) => c === "unwrap").length, 0);
    assert.equal((await readJournal(fixture.directory))!.balanceCleanupId, undefined);
  } finally {
    await fixture.dispose();
  }
});

test("a settled rebalance is not re-quoted or submitted again if its checkpoint was interrupted", async () => {
  const fixture = await setupRebalance();
  try {
    const execute = fixture.session.execute;
    fixture.session.execute = async (...args) => {
      await execute(...args);
      throw new Error("Interrupted after settlement");
    };
    await assert.rejects(fixture.session.cleanup(true), /Interrupted after settlement/);
    fixture.session.quoteSwap = async () => {
      throw new Error("Must not prepare another swap");
    };
    fixture.session.execute = async () => {
      throw new Error("Must not resubmit");
    };
    assert.equal((await fixture.session.cleanup(true)).completed, true);
    assert.deepEqual(fixture.calls, ["wrap", "approve", "swap"]);
  } finally {
    await fixture.dispose();
  }
});

test("a restart after a settled rebalance retries only the remaining unwrap", async () => {
  const fixture = await setupRebalance(usd("41.5"), 58n * USD, 250_000_000_000_000n);
  try {
    const native = fixture.session.nativeTransaction;
    fixture.session.nativeTransaction = async () => {
      throw new Error("Interrupted before unwrap");
    };
    await assert.rejects(fixture.session.cleanup(true, false), /Interrupted before unwrap/);
    assert.deepEqual(fixture.calls, ["approve", "swap"]);
    fixture.session.nativeTransaction = native;
    assert.equal((await fixture.session.cleanup(true)).completed, true);
    assert.deepEqual(fixture.calls, ["approve", "swap", "unwrap"]);
    assert.equal(fixture.state.wrappedAmount, 0n);
  } finally {
    await fixture.dispose();
  }
});

test("nested cleanup steps restore the parent checkpoint scope", async () => {
  const fixture = await setup();
  try {
    await fixture.session.step("parent", async () => {
      await fixture.session.step("child", async () => null);
      await fixture.session.remember("after-child", async () => "parent value");
    });
    const saved = (await readJournal(fixture.directory))!;
    assert.equal(saved.inventory?.["parent/after-child"], JSON.stringify("parent value"));
  } finally {
    await fixture.dispose();
  }
});

async function setup(profile: FeeProfile = "economy") {
  const directory = await mkdtemp(join(tmpdir(), "gmx-funded-session-"));
  const previous = process.env.REGRESSION_PRIVATE_KEY;
  // Public test key, never loaded from the user's env file.
  process.env.REGRESSION_PRIVATE_KEY = `0x${"1".repeat(64)}`;
  const session = new FundedSession(profile);
  if (previous === undefined) delete process.env.REGRESSION_PRIVATE_KEY;
  else process.env.REGRESSION_PRIVATE_KEY = previous;
  Object.defineProperty(session, "directory", { value: directory });
  const journal: FundedJournal = {
    version: 1,
    id: "run",
    chainId: 42161,
    address: session.address,
    createdAt: new Date().toISOString(),
    initialNativeUsd: (20n * USD).toString(),
    initialStableUsd: (80n * USD).toString(),
    marketAddress: "0x2222222222222222222222222222222222222222",
    ownedOrderKeys: [],
    ownedPositionKeys: [],
    actions: [],
    completed: false,
  };
  await writeJournal(directory, journal);
  await session.resume("run");
  return { session, directory, journal, dispose: () => rm(directory, { recursive: true, force: true }) };
}

test("retry reuses the recorded open position and does not prepare another trade", async () => {
  const fixture = await setup();
  try {
    const { journal, directory, session } = fixture;
    journal.ownedPositionKeys = ["position"];
    journal.actions = [{ id: "open", purpose: "open", feeUsd: USD.toString(), requestId: "request", state: "settled" }];
    await writeJournal(directory, journal);
    await session.resume("run");
    session.snapshot = async () =>
      ({
        positions: [{ key: "position", isLong: true, sizeInUsd: 2n * USD, collateralUsd: 3n * USD }],
        orders: [],
        onchainPositionCount: 1,
        onchainOrderCount: 0,
      }) as unknown as Awaited<ReturnType<FundedSession["snapshot"]>>;
    session.sdk.prepareOrder = async () => {
      throw new Error("Must not prepare another paid order");
    };
    const result = await session.openSmallPosition(true);
    assert.equal(result.sizeUsd, 2n * USD);
    assert.equal((await readJournal(directory))!.actions.length, 1);
  } finally {
    await fixture.dispose();
  }
});

test("cleanup refuses positions not recorded as belonging to this run", async () => {
  const fixture = await setup();
  try {
    fixture.session.snapshot = async () =>
      ({
        positions: [{ key: "someone-else" }],
        orders: [],
        onchainPositionCount: 1,
        onchainOrderCount: 0,
      }) as unknown as Awaited<ReturnType<FundedSession["snapshot"]>>;
    await assert.rejects(fixture.session.cleanup(true), /Unowned exposure/);
    assert.equal((await readJournal(fixture.directory))!.completed, false);
  } finally {
    await fixture.dispose();
  }
});

test("an uncertain request blocks cleanup without resubmission", async () => {
  const fixture = await setup();
  try {
    fixture.journal.actions = [
      { id: "uncertain", purpose: "open", feeUsd: USD.toString(), requestId: "request", state: "pending" },
    ];
    await writeJournal(fixture.directory, fixture.journal);
    fixture.session.sdk.fetchOrderStatus = async () => {
      throw new Error("status unavailable");
    };
    fixture.session.sdk.submitOrder = async () => {
      throw new Error("Must not resubmit");
    };
    await assert.rejects(fixture.session.cleanup(true), /status unavailable/);
    assert.equal((await readJournal(fixture.directory))!.actions[0].state, "pending");
  } finally {
    await fixture.dispose();
  }
});

test("cleanup can cancel a mined order still waiting for a keeper, without resubmitting its opening", async () => {
  const fixture = await setup();
  try {
    fixture.journal.actions = [
      { id: "open", purpose: "open", feeUsd: USD.toString(), requestId: "request", state: "pending" },
    ];
    await writeJournal(fixture.directory, fixture.journal);
    await fixture.session.resume("run");
    fixture.session.sdk.fetchOrderStatus = async () => ({
      requestId: "request",
      status: "created",
      orderKeys: ["order"],
      txHash: `0x${"1".repeat(64)}`,
    });
    fixture.session.rpc.waitForTransactionReceipt = async () => ({ status: "success" }) as never;
    fixture.session.sdk.submitOrder = async () => {
      throw new Error("Must not resubmit");
    };
    await fixture.session.reconcile(true);
    const saved = (await readJournal(fixture.directory))!;
    assert.equal(saved.actions[0].state, "created");
    assert.deepEqual(saved.ownedOrderKeys, ["order"]);
    fixture.session.sdk.fetchOrderStatus = async () => ({ requestId: "request", status: "cancelled" });
    await fixture.session.reconcile();
    assert.equal((await readJournal(fixture.directory))!.actions[0].state, "failed");
  } finally {
    await fixture.dispose();
  }
});

test("a cancel request settles on its successful relay receipt without waiting for a keeper", async () => {
  const fixture = await setup();
  try {
    fixture.journal.actions = [
      { id: "cancel", purpose: "cancel", feeUsd: USD.toString(), requestId: "request", state: "pending" },
    ];
    await writeJournal(fixture.directory, fixture.journal);
    await fixture.session.resume("run");
    fixture.session.sdk.fetchOrderStatus = async () => ({
      requestId: "request",
      status: "created",
      txHash: `0x${"1".repeat(64)}`,
    });
    fixture.session.rpc.waitForTransactionReceipt = async () => ({ status: "success" }) as never;
    await fixture.session.reconcile();
    assert.equal((await readJournal(fixture.directory))!.actions[0].state, "settled");
  } finally {
    await fixture.dispose();
  }
});

test("fee transactions and edits settle while a resting limit order remains open", async () => {
  const fixture = await setup();
  try {
    const session = fixture.session;
    session.active.actions = [
      {
        id: "limit",
        purpose: "trigger",
        feeUsd: "1",
        requestId: "limit",
        state: "created",
        settlement: "creation",
      },
      {
        id: "wrap",
        purpose: "wrap-cancel-fee",
        feeUsd: "1",
        state: "pending",
        txHash: `0x${"1".repeat(64)}`,
      },
      {
        id: "edit",
        purpose: "edit",
        feeUsd: "1",
        requestId: "edit",
        state: "pending",
        settlement: "receipt",
      },
    ];
    session.sdk.fetchOrderStatus = async ({ requestId }) => ({
      requestId: requestId!,
      status: "created",
      orderKeys: ["limit-key"],
      txHash: `0x${"1".repeat(64)}`,
    });
    session.rpc.waitForTransactionReceipt = async () => ({ status: "success" }) as never;
    await session.reconcile(true);
    assert.deepEqual(
      session.active.actions.map((a) => a.state),
      ["created", "settled", "settled"]
    );
    assert.deepEqual(session.active.ownedOrderKeys, ["limit-key"]);
  } finally {
    await fixture.dispose();
  }
});

test("no-cost cleanup completes when exposure is empty and the ratio is within tolerance", async () => {
  const fixture = await setup();
  try {
    fixture.session.snapshot = async () =>
      ({
        positions: [],
        orders: [],
        wrappedAmount: 0n,
        nativeUsd: 20n * USD,
        stableUsd: 79n * USD,
        onchainPositionCount: 0,
        onchainOrderCount: 0,
      }) as unknown as Awaited<ReturnType<FundedSession["snapshot"]>>;
    const result = await fixture.session.cleanup(true);
    assert.equal(result.completed, true);
    assert.equal((await readJournal(fixture.directory))!.completed, true);
  } finally {
    await fixture.dispose();
  }
});

test("cleanup cancels orders before closing positions and only then completes the journal", async () => {
  const fixture = await setup();
  try {
    fixture.journal.ownedOrderKeys = ["order"];
    fixture.journal.ownedPositionKeys = ["position"];
    await writeJournal(fixture.directory, fixture.journal);
    const state = {
      usdc: { address: "USDC" },
      positions: [
        {
          key: "position",
          marketAddress: fixture.journal.marketAddress,
          collateralTokenAddress: "USDC",
          collateralAmount: 2_499_162n,
          isLong: true,
          sizeInUsd: 2n * USD,
        },
      ],
      orders: [{ key: "order" }],
      onchainPositionCount: 1,
      onchainOrderCount: 1,
      wrappedAmount: 0n,
      nativeUsd: 20n * USD,
      stableUsd: 79n * USD,
    };
    fixture.session.snapshot = async () => state as unknown as Awaited<ReturnType<FundedSession["snapshot"]>>;
    fixture.session.sdk.prepareCancelOrder = async (request) => {
      assert.deepEqual(request.orderIds, ["order"]);
      assert.equal(request.all, undefined);
      return {} as Awaited<ReturnType<typeof fixture.session.sdk.prepareCancelOrder>>;
    };
    fixture.session.sdk.prepareOrder = async (request) => {
      assert.equal(request.kind, "decrease");
      assert.equal(request.receiveToken, "USDC");
      assert.equal(state.orders.length, 0);
      return {} as Awaited<ReturnType<typeof fixture.session.sdk.prepareOrder>>;
    };
    const calls: string[] = [];
    Object.defineProperty(fixture.session, "execute", {
      value: async (_prepared: unknown, intent: unknown, purpose: string) => {
        assert.equal((await readJournal(fixture.directory))!.completed, false);
        calls.push(purpose);
        if (purpose === "cancel") {
          state.orders = [];
          state.onchainOrderCount = 0;
        } else if (purpose === "close") {
          assert.deepEqual(intent, { kind: "close", isLong: true, sizeUsd: 2n * USD, collateralAmount: 2_499_162n });
          state.positions = [];
          state.onchainPositionCount = 0;
        } else assert.fail("Unexpected rebalance for a small drift");
      },
    });
    const result = await fixture.session.cleanup(true);
    assert.equal(result.completed, true);
    assert("positionsBefore" in result);
    assert.equal(result.positionsBefore, 1);
    assert.equal(result.ordersBefore, 1);
    assert.equal(result.positions, 0);
    assert.equal(result.orders, 0);
    assert.deepEqual(calls, ["cancel", "close"]);
    assert.equal((await fixture.session.cleanup(true)).completed, true);
    assert.deepEqual(calls, ["cancel", "close"]);
  } finally {
    await fixture.dispose();
  }
});

test("1CT retry after cancellation or revocation does not reactivate an exhausted authorization", async () => {
  const fixture = await setup();
  try {
    const { session } = fixture;
    session.active.inventory = { subaccount: "0x3333333333333333333333333333333333333333" };
    session.active.actions.push({
      id: "cancel",
      purpose: "cancel",
      step: "one-click:cancel",
      state: "settled",
      feeUsd: "1",
    });
    session.sdk.generateSubaccount = async () => {
      throw new Error("Must not sign again");
    };
    session.sdk.activateSubaccount = async () => {
      throw new Error("Must not reactivate");
    };
    await session.save();
    for (let retry = 0; retry < 3; retry++) {
      await session.resume("run");
      assert.equal(await session.activateOneClick(), session.active.inventory!.subaccount);
    }
  } finally {
    await fixture.dispose();
  }
});
