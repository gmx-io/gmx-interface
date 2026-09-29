import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { USD } from "./economy";
import { readJournal, writeJournal, type FundedJournal } from "./journal";
import { FundedSession } from "./session";

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "gmx-funded-session-"));
  const previous = process.env.REGRESSION_PRIVATE_KEY;
  // Public test key, never loaded from the user's env file.
  process.env.REGRESSION_PRIVATE_KEY = `0x${"1".repeat(64)}`;
  const session = new FundedSession();
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
      value: async (_prepared: unknown, _intent: unknown, purpose: string) => {
        assert.equal((await readJournal(fixture.directory))!.completed, false);
        calls.push(purpose);
        if (purpose === "cancel") {
          state.orders = [];
          state.onchainOrderCount = 0;
        } else if (purpose === "close") {
          state.positions = [];
          state.onchainPositionCount = 0;
        } else assert.fail("Unexpected rebalance for a small drift");
      },
    });
    assert.equal((await fixture.session.cleanup(true)).completed, true);
    assert.deepEqual(calls, ["cancel", "close"]);
    assert.equal((await fixture.session.cleanup(true)).completed, true);
    assert.deepEqual(calls, ["cancel", "close"]);
  } finally {
    await fixture.dispose();
  }
});
