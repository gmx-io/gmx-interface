import { expect, test as base } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { USD } from "./economy";
import { readJournal, writeJournal, type FundedJournal } from "./journal";
import { FundedSession } from "./session";

const test = base.extend<{ session: FundedSession }>({
  session: async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), "gmx-funded-playwright-"));
    const originalKey = process.env.REGRESSION_PRIVATE_KEY;
    // Public test key; the user's env file is never loaded by this project.
    process.env.REGRESSION_PRIVATE_KEY = `0x${"1".repeat(64)}`;
    let session: FundedSession;
    try {
      session = new FundedSession();
    } finally {
      if (originalKey === undefined) delete process.env.REGRESSION_PRIVATE_KEY;
      else process.env.REGRESSION_PRIVATE_KEY = originalKey;
    }
    Object.defineProperty(session, "directory", { value: directory });
    const forbidden = async () => {
      throw new Error("Offline runtime test attempted a paid operation");
    };
    session.nativeTransaction = forbidden;
    session.execute = forbidden;
    session.sdk.signOrder = forbidden;
    session.sdk.signCrossChainWithdraw = forbidden;
    session.rpc.request = forbidden;
    session.sourceRpc.request = forbidden;
    session.snapshot = async () =>
      ({
        positions: [],
        orders: [],
        onchainPositionCount: 0,
        onchainOrderCount: 0,
        wrappedAmount: 0n,
        nativeUsd: 50n * USD,
        stableUsd: 50n * USD,
      }) as unknown as Awaited<ReturnType<FundedSession["snapshot"]>>;
    const journal: FundedJournal = {
      version: 1,
      id: "offline-run",
      chainId: 42161,
      address: session.address,
      createdAt: new Date().toISOString(),
      initialNativeUsd: (80n * USD).toString(),
      initialStableUsd: (20n * USD).toString(),
      targetNativeBps: "5000",
      marketAddress: "0x2222222222222222222222222222222222222222",
      ownedOrderKeys: [],
      ownedPositionKeys: [],
      actions: [],
      completed: false,
      inventory: { initialNativeAmount: "1", initialStableAmount: "20000000" },
    };
    try {
      await writeJournal(directory, journal);
      await session.resume(journal.id);
      await use(session);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
});

test("offline runtime: cleanup loads resources inside Playwright and survives restart", async ({ session }) => {
  await session.step("smoke-refresh:cleanup", () => session.cleanup(true, false));
  const saved = (await readJournal(session.directory))!;
  expect(saved.checkpoints?.["smoke-refresh:cleanup"].finishedAt).toBeTruthy();
  expect(saved.completed).toBe(false);
  expect(saved.targetNativeBps).toBe("5000");
  await session.resume("offline-run");
  const result = await session.cleanup(true);
  expect(result).toMatchObject({ completed: true, positions: 0, orders: 0, reservedFeesUsd: "0" });
  expect((await readJournal(session.directory))!.actions).toEqual([]);
  expect(await session.cleanup(true)).toEqual({ completed: true, alreadyClean: true });
});

test("offline runtime: bridge reconciliation loads inside Playwright without resubmission", async ({ session }) => {
  session.active.actions.push({
    id: "bridge",
    purpose: "bridge-withdraw",
    requestId: "bridge",
    requestKind: "bridge",
    state: "pending",
    feeUsd: (USD / 2n).toString(),
  });
  session.sdk.getCrossChainWithdrawStatus = async () => ({
    requestId: "bridge",
    status: "executed",
    txHash: `0x${"1".repeat(64)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  session.rpc.waitForTransactionReceipt = async () => ({ status: "success" }) as never;
  await session.reconcile(true);
  const actions = (await readJournal(session.directory))!.actions;
  expect(actions).toHaveLength(1);
  expect(actions[0]).toMatchObject({ state: "settled", feeUsd: (USD / 2n).toString() });
});

test("offline runtime: TWAP receipts without order ownership remain unresolved", async ({ session }) => {
  session.active.actions.push({
    id: "twap",
    purpose: "twap",
    txHash: `0x${"1".repeat(64)}`,
    state: "pending",
    feeUsd: USD.toString(),
  });
  await session.save();
  session.rpc.waitForTransactionReceipt = async () => ({ status: "success", logs: [] }) as never;
  await expect(session.reconcile(true)).rejects.toThrow("TWAP receipt must create two orders");
  expect((await readJournal(session.directory))!.actions[0].state).toBe("pending");
});
