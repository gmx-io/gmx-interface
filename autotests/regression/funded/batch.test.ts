import assert from "node:assert/strict";
import { test } from "node:test";

import { batchOptions, createBatch, runFundedBatch, type BatchCaseResult, type FundedBatch } from "./batch";
import { fundedCases, selectFundedCases } from "./catalog";
import { usd } from "./economy";

const success = (reservedFeesUsd = "1"): BatchCaseResult => ({ exitCode: 0, cleanupCompleted: true, reservedFeesUsd });
const save = async () => {};

test("batch defaults to every case and a $5 total budget; GLV alone receives its existing profile", () => {
  const options = batchOptions([]);
  assert.deepEqual(options.selected, fundedCases);
  assert.equal(options.execute, false);
  assert.equal(options.budgetUsd, usd("5"));
  const batch = createBatch(options.selected, options.budgetUsd);
  assert.equal(batch.cases.filter((c) => c.feeProfile === "glv").length, 1);
  assert.equal(batch.cases.find((c) => c.feeProfile === "glv")?.id, "glv");
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

test("failure or incomplete cleanup stops later cases and retains that case's full reservations", async () => {
  for (const result of [
    { ...success("1.25"), exitCode: 1 },
    { ...success("1.25"), cleanupCompleted: false },
    { ...success("1.25"), exitCode: 130 },
  ]) {
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
    assert.equal(batch.reservedFeesUsd, "1.25");
    assert.equal(batch.cases[1].status, "not-run");
  }
});

test("unknown or invalid fee accounting fails closed, without claiming a complete cost total", async () => {
  for (const fees of [null, "NaN", "-1"]) {
    const batch = createBatch(fundedCases, usd("30"));
    await runFundedBatch(batch, async () => ({ ...success(), reservedFeesUsd: fees }), save);
    assert.equal(batch.status, "failed");
    assert.equal(batch.accountingComplete, false);
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

test("a case reporting more than its own allowance stops the batch", async () => {
  const batch = createBatch(fundedCases, usd("30"));
  await runFundedBatch(batch, async () => success("5.01"), save);
  assert.equal(batch.status, "failed");
  assert.equal(batch.reservedFeesUsd, "5.01");
  assert.equal(batch.cases[1].status, "not-run");
});
