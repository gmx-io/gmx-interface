import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { USD, usd } from "./economy";
import { readJournal, withWalletLock, writeJournal, type FundedJournal } from "./journal";
import { withFundedRecovery } from "./recovery";
import { FundedSession } from "./session";

const originalCwd = process.cwd();
const originalExecute = process.env.REGRESSION_FUNDED_EXECUTE;
let root: string;
function testRecovery(name: string, run: () => Promise<void>) {
  test(name, async () => {
    root = await mkdtemp(join(tmpdir(), "gmx-funded-recovery-"));
    // Keep report output away from the user's latest funded results.
    process.chdir(root);
    process.env.REGRESSION_FUNDED_EXECUTE = "1";
    try {
      await run();
    } finally {
      process.chdir(originalCwd);
      if (originalExecute === undefined) delete process.env.REGRESSION_FUNDED_EXECUTE;
      else process.env.REGRESSION_FUNDED_EXECUTE = originalExecute;
      await rm(root, { recursive: true, force: true });
    }
  });
}

async function fixture() {
  const directory = await mkdtemp(join(root, "wallet-"));
  const previousKey = process.env.REGRESSION_PRIVATE_KEY;
  process.env.REGRESSION_PRIVATE_KEY = `0x${"1".repeat(64)}`;
  let session: FundedSession;
  try {
    session = new FundedSession();
  } finally {
    if (previousKey === undefined) delete process.env.REGRESSION_PRIVATE_KEY;
    else process.env.REGRESSION_PRIVATE_KEY = previousKey;
  }
  Object.defineProperty(session, "directory", { value: directory });
  const forbidden = async () => {
    throw new Error("Offline recovery test attempted a transaction or RPC");
  };
  session.nativeTransaction = forbidden;
  session.execute = forbidden;
  session.rpc.request = forbidden;
  session.sourceRpc.request = forbidden;
  session.snapshot = async () =>
    ({
      positions: [],
      orders: [],
      onchainPositionCount: 0,
      onchainOrderCount: 0,
      wrappedAmount: 0n,
      nativeAmount: 1n,
      stableAmount: 1n,
      nativeUsd: 50n * USD,
      stableUsd: 50n * USD,
      weth: { prices: { minPrice: 2000n * USD } },
    }) as unknown as Awaited<ReturnType<FundedSession["snapshot"]>>;
  const journal: FundedJournal = {
    version: 1,
    id: "previous-run",
    chainId: 42161,
    address: session.address,
    createdAt: new Date().toISOString(),
    initialNativeUsd: (50n * USD).toString(),
    initialStableUsd: (50n * USD).toString(),
    targetNativeBps: "5000",
    marketAddress: "0x2222222222222222222222222222222222222222",
    ownedOrderKeys: [],
    ownedPositionKeys: [],
    actions: [],
    completed: false,
  };
  await writeJournal(directory, journal);
  return { session, directory, journal };
}

testRecovery("automatic recovery requires execution opt-in and leaves the journal untouched without it", async () => {
  const { session, directory, journal } = await fixture();
  delete process.env.REGRESSION_FUNDED_EXECUTE;
  try {
    await assert.rejects(
      withFundedRecovery(session, async () => assert.fail("Must not start")),
      /requires --execute/
    );
    assert.deepEqual(await readJournal(directory), journal);
    await assert.rejects(access(join(directory, "lock")));
  } finally {
    process.env.REGRESSION_FUNDED_EXECUTE = "1";
  }
});

testRecovery("no previous run or an already completed run starts under the lock without cleanup", async () => {
  for (const existing of [false, true]) {
    const { session, directory, journal } = await fixture();
    if (existing) await writeJournal(directory, { ...journal, completed: true });
    else await rm(join(directory, "active.json"));
    session.cleanup = async () => assert.fail("Completed or absent journal must not be cleaned");
    const result = await withFundedRecovery(session, async (recovery) => {
      assert.equal(recovery, undefined);
      await assert.rejects(
        withWalletLock(directory, async () => {}),
        /locked/
      );
      return 42;
    });
    assert.equal(result, 42);
    await assert.rejects(access(join(directory, "lock")));
  }
});

testRecovery("actual no-cost cleanup completes the retained journal before starting a new run", async () => {
  const { session, directory } = await fixture();
  await withFundedRecovery(
    session,
    async (recovery) => {
      assert.equal(recovery?.completed, true);
      assert.equal(recovery.reservedFeesUsd, "0");
      assert.equal((await readJournal(directory))?.completed, true);
      await assert.rejects(
        withWalletLock(directory, async () => {}),
        /locked/
      );
    },
    usd("5")
  );
});

testRecovery("recovery preserves the old GLV budget and reports only additional fees to the new batch", async () => {
  const { session, directory, journal } = await fixture();
  journal.feeProfile = "glv";
  journal.actions.push({ id: "old", purpose: "deposit", feeUsd: usd("7").toString(), state: "settled" });
  await writeJournal(directory, journal);
  session.cleanup = async (execute) => {
    assert.equal(execute, true);
    assert.equal(session.feeProfile, "glv");
    assert.equal(session.feePolicy.runFeeLimitUsd, usd("8"));
    await assert.rejects(
      withWalletLock(directory, async () => {}),
      /locked/
    );
    session.active.actions.push({ id: "recovery", purpose: "unwrap", feeUsd: usd("0.6").toString(), state: "settled" });
    session.active.completed = true;
    await session.save();
    return { completed: true, alreadyClean: true };
  };
  await withFundedRecovery(
    session,
    async (recovery) => {
      assert.equal(recovery?.previousReservedFeesUsd, "7");
      assert.equal(recovery.totalRunReservedFeesUsd, "7.6");
      assert.equal(recovery.reservedFeesUsd, "0.6");
      assert.equal((await readJournal(directory))?.id, journal.id);
      const report = JSON.parse(await readFile(join(directory, `report-${journal.id}.json`), "utf8"));
      assert.equal(report.cleanupCompleted, true);
      assert.equal(report.feeProfile, "glv");
    },
    usd("1")
  );
});

for (const reason of ["Gas price exceeds configured ceiling", "Fee budget exceeded", "Unowned exposure found"]) {
  testRecovery(`failed recovery stops new tests and preserves the old journal: ${reason}`, async () => {
    const { session, directory, journal } = await fixture();
    session.cleanup = async () => {
      throw new Error(reason);
    };
    await assert.rejects(
      withFundedRecovery(session, async () => assert.fail("Must not start")),
      new RegExp(reason)
    );
    assert.deepEqual(await readJournal(directory), journal);
    const report = JSON.parse(await readFile(join(directory, `report-${journal.id}.json`), "utf8"));
    assert.equal(report.cleanupCompleted, false);
    await assert.rejects(access(join(directory, "lock")));
  });
}

testRecovery("recovery cannot start when the old remaining allowance does not fit the new batch budget", async () => {
  const { session, directory, journal } = await fixture();
  session.cleanup = async () => assert.fail("Budget must be checked before cleanup");
  await assert.rejects(
    withFundedRecovery(session, async () => {}, usd("4.99")),
    /remaining \$5 cleanup allowance/
  );
  assert.deepEqual(await readJournal(directory), journal);
});

testRecovery("an incomplete cleanup result or journal never starts a new case", async () => {
  for (const reportedComplete of [false, true]) {
    const { session, directory } = await fixture();
    session.cleanup = async () => ({ completed: reportedComplete, alreadyClean: true });
    await assert.rejects(
      withFundedRecovery(session, async () => assert.fail("Must not start")),
      /incomplete|did not complete/
    );
    assert.equal((await readJournal(directory))?.completed, false);
  }
});

testRecovery("recovery does not proceed if the retained fee accounting exceeds the old budget", async () => {
  const { session, journal } = await fixture();
  session.cleanup = async () => {
    session.active.actions.push({
      id: "over-limit",
      purpose: "cleanup",
      feeUsd: usd("5.01").toString(),
      state: "settled",
    });
    session.active.completed = true;
    await session.save();
    return { completed: true, alreadyClean: true };
  };
  await assert.rejects(
    withFundedRecovery(session, async () => assert.fail("Must not start")),
    /exceeded the previous run/
  );
  assert.equal((await readJournal(session.directory))?.id, journal.id);
});

testRecovery("a competing process holding the wallet lock prevents both recovery and new tests", async () => {
  const { session, directory } = await fixture();
  session.cleanup = async () => assert.fail("Must not clean another active run");
  await withWalletLock(directory, async () => {
    await assert.rejects(
      withFundedRecovery(session, async () => assert.fail("Must not start")),
      /locked/
    );
  });
});
