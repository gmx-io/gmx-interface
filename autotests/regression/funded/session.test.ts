import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Hex } from "viem";

import { fundedOrderReceipt } from "./fundedReceipt";
import { USD, usd } from "./economy";
import { readJournal, writeJournal } from "./journal";
import type { FundedSession } from "./session";
import { withdrawAccount } from "./account";
import { unstake } from "./earn";
import { withdrawLiquidity } from "./liquidity";
import { testJournal, testSession } from "./testSession";

const orderKey = `0x${"2".repeat(64)}` as Hex;

test("relay fee failure survives journal reload and retries cannot submit the order again", async () => {
  const fixture = await setup();
  try {
    const { session, directory } = fixture;
    session.active.actions = [
      {
        id: "close",
        purpose: "close",
        step: "market-long:cleanup",
        requestId: "request",
        state: "pending",
        feeUsd: (USD / 2n).toString(),
      },
    ];
    await session.save();
    session.sdk.fetchOrderStatus = async () => ({
      requestId: "request",
      status: "relay_failed",
      error: { code: "RELAY_FAILED", message: "InsufficientRelayFee(63929528447360,62685121314477)" },
    });
    await session.reconcile();
    const saved = (await readJournal(directory))!;
    assert.equal(saved.actions[0].state, "failed");
    assert.match(saved.actions[0].failureReason!, /Relay fee quote was insufficient/);
    assert.deepEqual(saved.ownedOrderKeys, []);
    session.sdk.prepareOrder = session.sdk.submitOrder = async () => {
      throw new Error("Must not submit again");
    };
    for (let retry = 0; retry < 2; retry++) {
      await session.resume("run");
      await assert.rejects(
        session.step("market-long:cleanup", () => session.previousAction("close")),
        /Relay fee quote was insufficient/
      );
    }
    assert.equal(session.active.actions.length, 1);
    assert.equal(session.active.actions[0].feeUsd, (USD / 2n).toString());
  } finally {
    await fixture.dispose();
  }
});

for (const [receipt, cancelledKeys] of [
  ["matching", [orderKey]],
  ["missing", []],
  ["different", [`0x${"3".repeat(64)}` as Hex]],
] as const) {
  test(`a cancellation with a ${receipt} OrderCancelled receipt ${receipt === "matching" ? "settles without waiting for a keeper" : "stays pending"}`, async () => {
    const fixture = await setup();
    try {
      const { session, directory } = fixture;
      session.active.ownedOrderKeys = [orderKey];
      session.active.actions = [
        { id: "cancel", purpose: "cancel", requestId: "request", state: "pending", orderKeys: [orderKey], feeUsd: "1" },
      ];
      await session.save();
      session.sdk.fetchOrderStatus = async () => ({
        requestId: "request",
        status: "created",
        txHash: `0x${"1".repeat(64)}`,
      });
      session.rpc.waitForTransactionReceipt = async () =>
        fundedOrderReceipt({
          account: session.address,
          market: session.active.marketAddress,
          eventName: "OrderCancelled",
          keys: [...cancelledKeys],
        });
      if (receipt === "matching") await session.reconcile();
      else await assert.rejects(session.reconcile(), /Cancellation receipt does not match/);
      const saved = (await readJournal(directory))!;
      assert.equal(saved.actions[0].state, receipt === "matching" ? "settled" : "pending");
      assert.deepEqual(saved.ownedOrderKeys, [orderKey]);
    } finally {
      await fixture.dispose();
    }
  });
}

test("a pending native transaction settles from its receipt and records the paid gas", async () => {
  const fixture = await setup();
  try {
    const { session } = fixture;
    session.active.actions = [
      { id: "wrap", purpose: "wrap-cancel-fee", feeUsd: "1", state: "pending", txHash: `0x${"1".repeat(64)}` },
    ];
    session.rpc.waitForTransactionReceipt = async () =>
      ({ status: "success", gasUsed: 2n, effectiveGasPrice: 3n }) as never;
    await session.reconcile();
    assert.equal(session.active.actions[0].state, "settled");
    assert.equal(session.active.actions[0].gasPaidWei, "6");
  } finally {
    await fixture.dispose();
  }
});

test("plan explains a reserve rejection without replacing the completed journal", async () => {
  const fixture = await setup();
  try {
    const { session, journal, directory } = fixture;
    journal.completed = true;
    await writeJournal(directory, journal);
    const requiredStable = usd("17.5");
    const requiredNative = usd("5");
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
    session.quoteIncrease = async () => ({ sizeUsd: 2n * USD, collateralUsd: usd("2.5"), feeUsd: usd("0.5") }) as never;
    const plan = await session.plan();
    assert.equal(plan.startingReserves.sufficient, false);
    assert.deepEqual(plan.startingReserves.shortfallUsd, { USDC: "0.8644", ETH: "0" });
    assert.deepEqual(plan.startingReserves.requiredUsd, { USDC: "17.5", ETH: "5" });
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
    session.active.actions.push({ id: "reverted", purpose: "ui:gm-deposit", state: "failed", feeUsd: "1" });
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

async function setupRebalance(nativeUsd = 58n * USD, stableUsd = 42n * USD, wrappedAmount = 0n) {
  const fixture = await setup();
  const { session, journal } = fixture;
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

for (const buying of [false, true]) {
  test(`cleanup ${buying ? "buys" : "sells"} ETH to the persisted 50/50 target`, async () => {
    const fixture = await setupRebalance(buying ? 42n * USD : 58n * USD, buying ? 58n * USD : 42n * USD);
    try {
      const { session } = fixture;
      const amount = buying ? 8_000_000n : 4_000_000_000_000_000n;
      const quote = session.quoteSwap;
      session.quoteSwap = async (state, requestedAmount, requestedBuying, unwrapNative) => {
        assert.equal(requestedAmount, amount);
        assert.equal(requestedBuying, buying);
        return quote(state, requestedAmount, requestedBuying, unwrapNative);
      };
      const allowance = session.allowance;
      session.allowance = async (token, requestedAmount, cleanup) => {
        assert.equal(requestedAmount, amount + (buying ? 1_000_000n : 0n));
        return allowance(token, requestedAmount, cleanup);
      };
      assert.equal((await session.cleanup(true)).completed, true);
      assert.deepEqual(fixture.calls, buying ? ["approve", "swap"] : ["wrap", "approve", "swap"]);
      assert.equal((await readJournal(fixture.directory))!.targetNativeBps, "5000");
    } finally {
      await fixture.dispose();
    }
  });
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

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "gmx-funded-session-"));
  const session = testSession();
  Object.defineProperty(session, "directory", { value: directory });
  const journal = testJournal(session.address);
  await writeJournal(directory, journal);
  await session.resume("run");
  return { session, directory, journal, dispose: () => rm(directory, { recursive: true, force: true }) };
}

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
      { id: "uncertain", purpose: "close", feeUsd: USD.toString(), requestId: "request", state: "pending" },
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
      nativeUsd: 50n * USD,
      stableUsd: 49n * USD,
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
