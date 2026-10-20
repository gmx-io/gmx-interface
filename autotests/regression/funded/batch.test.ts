import assert from "node:assert/strict";
import { test } from "node:test";

import {
  batchBalanceChange,
  batchOptions,
  createBatch,
  runFundedBatch,
  type BatchCaseResult,
  type FundedBatch,
} from "./batch";
import { fundedCases, selectFundedCases } from "./catalog";
import { usd } from "./economy";

const success = (reservedFeesUsd = "1"): BatchCaseResult => ({ exitCode: 0, cleanupCompleted: true, reservedFeesUsd });
const save = async () => {};

test("batch balance change sums every measured case and stays unknown while a measurement is missing", () => {
  const changes = (amount: string | null | undefined) => ({ ...success(), balanceChangeAtStartPricesUsd: amount });
  for (const [second, totalUsd, missingCases] of [
    [{}, "-0.4", []],
    [{ status: "passed", result: changes("0.65") }, "0.25", []],
    [{ status: "failed", result: { ...changes("0"), exitCode: 1 } }, "-0.4", []],
    [{ status: "running" }, null, ["glv"]],
    ...[undefined, null, "NaN", "Infinity", "1e3", "0.0000000000000000000000000000001"].map((amount) => [
      { status: "passed", result: changes(amount) },
      null,
      ["glv"],
    ]),
  ] as [Partial<FundedBatch["cases"][number]>, string | null, string[]][]) {
    const batch = createBatch(selectFundedCases(["--case", "gm,glv"]), usd("13"));
    Object.assign(batch.cases[0], { status: "passed", result: changes("-0.4") });
    Object.assign(batch.cases[1], second);
    const change = batchBalanceChange(batch);
    assert.equal(change.totalUsd, totalUsd);
    assert.deepEqual(change.missingCases, missingCases);
    if (missingCases.length) assert.equal(change.knownSubtotalUsd, "-0.4");
  }
});

test("batch defaults to same-chain cases and a $5 budget; bridge or all selection opts into multichain", () => {
  const options = batchOptions([]);
  assert.equal(options.execute, false);
  assert.equal(options.budgetUsd, usd("5"));
  const glv = createBatch(options.selected, options.budgetUsd).cases.filter((c) => c.feeProfile === "glv");
  assert.deepEqual(
    glv.map((c) => c.id),
    ["glv"]
  );
  for (const [args, selected, excluded] of [
    [[], fundedCases.filter((c) => c.id !== "bridge"), ["bridge"]],
    [["--case", "bridge"], fundedCases.filter((c) => c.id === "bridge"), []],
    [["--group", "bridge"], fundedCases.filter((c) => c.id === "bridge"), []],
    [["--group", "all"], fundedCases, []],
  ] as const) {
    const options = batchOptions([...args]);
    assert.deepEqual(options.selected, selected);
    assert.deepEqual(
      options.excluded.map((c) => c.id),
      excluded
    );
  }
});

test("recovery fees reduce the new batch allowance without charging historical fees again", async () => {
  const recovery = {
    runId: "previous-run",
    completed: true,
    seconds: 10,
    previousReservedFeesUsd: "3",
    totalRunReservedFeesUsd: "3.75",
    reservedFeesUsd: "0.75",
  };
  const blocked = createBatch(fundedCases, usd("5"), recovery);
  await runFundedBatch(blocked, async () => assert.fail("Next case cannot fit after recovery"), save);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.reservedFeesUsd, "0.75");
  const fits = createBatch(selectFundedCases([]), usd("5.75"), recovery);
  await runFundedBatch(fits, async () => success("1"), save);
  assert.equal(fits.status, "passed");
  assert.equal(fits.reservedFeesUsd, "1.75");
  assert.equal(fits.recovery?.previousReservedFeesUsd, "3");
  assert.throws(() => createBatch(fundedCases, usd("5"), { ...recovery, completed: false }));
  assert.throws(() => createBatch(fundedCases, usd("5"), { ...recovery, reservedFeesUsd: "5.01" }));
});

test("batch accepts an explicit total cap and selection, rejecting ambiguous amounts and flags", () => {
  const options = batchOptions(["--budget-usd", "20.50", "--case", "gm,glv", "--execute"]);
  assert.equal(options.budgetUsd, usd("20.50"));
  assert.equal(options.execute, true);
  assert.deepEqual(
    options.selected.map((c) => c.id),
    ["gm", "glv"]
  );
  for (const args of [
    ["--budget-usd"],
    ["--budget-usd", "--execute"],
    ["--budget-usd", "-1"],
    ["--budget-usd", "0"],
    ["--budget-usd", "1e3"],
    ["--budget-usd", "1.001"],
    ["--budget-usd", "5", "--budget-usd", "10"],
    ["--fee-profile", "glv"],
    ["--typo"],
  ])
    assert.throws(() => batchOptions(args));
});

test("all 17 cases run serially after previous cleanup, with incremental and final reports", async () => {
  const batch = createBatch(fundedCases, usd("30"));
  const order: string[] = [];
  const reports: FundedBatch[] = [];
  let active = false;
  await runFundedBatch(
    batch,
    async (scenario) => {
      assert.equal(active, false, "A funded case overlapped another case");
      active = true;
      order.push(`${scenario.id}:start`);
      await new Promise((resolve) => setImmediate(resolve));
      order.push(`${scenario.id}:cleanup`);
      active = false;
      return success(scenario.id === "glv" ? "6" : "0.5");
    },
    async (report) => {
      reports.push(structuredClone(report));
    }
  );
  assert.deepEqual(
    order,
    fundedCases.flatMap(({ id }) => [`${id}:start`, `${id}:cleanup`])
  );
  assert.equal(batch.status, "passed");
  assert.equal(batch.reservedFeesUsd, "14");
  assert.ok(batch.cases.every((c) => c.status === "passed"));
  assert.ok(reports.some((r) => r.cases[0].status === "running"));
  assert.equal(reports.at(-1)?.status, "passed");
});

test("full next-case allowance including cleanup must fit the remaining shared budget", async () => {
  const batch = createBatch(fundedCases, usd("5"));
  const calls: string[] = [];
  await runFundedBatch(
    batch,
    async ({ id }) => {
      calls.push(id);
      return success("0.25");
    },
    save
  );
  assert.deepEqual(calls, ["smoke-refresh"]);
  assert.equal(batch.status, "blocked");
  assert.equal(batch.reservedFeesUsd, "0.25");
  assert.equal(batch.cases[1].status, "blocked");
  assert.equal(batch.cases[2].status, "not-run");
});

test("GLV needs its $8 full allowance and uses the same total budget", async () => {
  const cases = selectFundedCases(["--case", "gm,glv"]);
  const blocked = createBatch(cases, usd("8"));
  let calls = 0;
  await runFundedBatch(
    blocked,
    async () => {
      calls++;
      return success("1");
    },
    save
  );
  assert.equal(calls, 1);
  assert.equal(blocked.cases[1].status, "blocked");
  const fits = createBatch(cases, usd("9"));
  await runFundedBatch(fits, async ({ id }) => success(id === "glv" ? "6" : "1"), save);
  assert.equal(fits.status, "passed");
  assert.equal(fits.reservedFeesUsd, "7");
});

test("a failed case, incomplete cleanup, bad fee accounting or overspend stops later cases", async () => {
  for (const [result, reservedFeesUsd, accountingComplete] of [
    [{ ...success("1.25"), exitCode: 1 }, "1.25", true],
    [{ ...success("1.25"), cleanupCompleted: false }, "1.25", true],
    [{ ...success("1.25"), exitCode: 130 }, "1.25", true],
    [success("5.01"), "5.01", true],
    ...[null, "NaN", "-1"].map((fees) => [{ ...success(), reservedFeesUsd: fees }, "0", false]),
  ] as [BatchCaseResult, string, boolean][]) {
    const batch = createBatch(fundedCases, usd("30"));
    let calls = 0;
    await runFundedBatch(
      batch,
      async () => {
        calls++;
        return result;
      },
      save
    );
    assert.equal(calls, 1);
    assert.equal(batch.status, "failed");
    assert.equal(batch.reservedFeesUsd, reservedFeesUsd);
    assert.equal(batch.accountingComplete, accountingComplete);
    assert.equal(batch.cases[1].status, "not-run");
  }
});

test("an unexpected exception is recorded, redacted and never retried as a fresh paid case", async () => {
  const batch = createBatch(fundedCases, usd("30"));
  const reports: FundedBatch[] = [];
  let calls = 0;
  await runFundedBatch(
    batch,
    async () => {
      calls++;
      throw new Error("https://rpc.example/?key=secret");
    },
    async (report) => {
      reports.push(structuredClone(report));
    }
  );
  assert.equal(calls, 1);
  assert.equal(batch.status, "failed");
  assert.equal(batch.accountingComplete, false);
  assert.doesNotMatch(JSON.stringify(reports), /secret/);
  assert.equal(reports.at(-1)?.status, "failed");
});

test("a report write failure prevents the next paid case", async () => {
  const batch = createBatch(fundedCases, usd("30"));
  let calls = 0;
  await assert.rejects(
    runFundedBatch(
      batch,
      async () => {
        calls++;
        return success();
      },
      async (report) => {
        if (report.cases[0].status === "passed") throw new Error("Disk full");
      }
    ),
    /Disk full/
  );
  assert.equal(calls, 1);
});
