import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fundedBalanceValues, playwrightFailure, writeFundedReport, type FundedRunDetails } from "./report";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { writeJournal } from "./journal";
import { testJournal } from "./testSession";

test("batch summaries show the final failed phase, ignore recovered retries and handle errors outside tests", () => {
  const reason = "deposit: API request failed: POSITION_NOT_FOUND (status 400). Request details omitted.";
  const results = (...results: { status: string; errors?: { message: string }[] }[]) => ({
    suites: [{ specs: [{ tests: [{ results }] }] }],
  });
  for (const [report, expected] of [
    [
      {
        errors: [{ message: "Testing stopped early after 1 maximum allowed failures." }],
        suites: [
          results(
            { status: "failed", errors: [{ message: "Error: connect read-only wallet: timeout" }] },
            { status: "failed", errors: [{ message: `Error: \u001b[31m${reason}\u001b[39m\nStack trace omitted` }] }
          ),
        ],
      },
      reason,
    ],
    [results({ status: "failed", errors: [{ message: "first attempt" }] }, { status: "passed" }), undefined],
    [{ errors: [{ message: "Worker stopped unexpectedly" }] }, "Worker stopped unexpectedly"],
    [{}, undefined],
  ] as [Parameters<typeof playwrightFailure>[0], string | undefined][])
    assert.equal(playwrightFailure(report), expected);
});

for (const higherPrice of [false, true]) {
  test(`interrupted cleanup retains WETH in cost accounting${higherPrice ? " without treating price movement as spending" : ""}`, () => {
    const price = (higherPrice ? 3000n : 2000n) * USD;
    const state = {
      nativeAmount: 20n * 10n ** 15n,
      wrappedAmount: 5n * 10n ** 15n,
      stableAmount: 50_000_000n,
      nativeUsd: price / 50n,
      stableUsd: 50n * USD,
      weth: { prices: { minPrice: price } },
    } as Awaited<ReturnType<FundedSession["snapshot"]>>;
    const journal = {
      initialNativeUsd: (50n * USD).toString(),
      initialStableUsd: (50n * USD).toString(),
      inventory: { initialNativeAmount: "25000000000000000", initialStableAmount: "50000000" },
    };
    const report = fundedBalanceValues(state, journal);
    assert.equal(report.wrapped, higherPrice ? "15" : "10");
    assert.equal(report.change, higherPrice ? "25" : "0");
    assert.equal(report.changeAtStartPrices, "0");
  });
}

test("cost reports retain preflight details and cleanup errors", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gmx-funded-report-"));
  const cwd = process.cwd();
  try {
    process.chdir(directory);
    await writeJournal(
      directory,
      testJournal("0x1111111111111111111111111111111111111111", {
        id: "report-test",
        selectedCases: ["one-click"],
        actions: [
          {
            id: "failed-relay",
            purpose: "ui:create",
            step: "one-click:create",
            requestId: "request",
            state: "failed",
            feeUsd: "1",
            failureReason: "Relay fee quote was insufficient",
          },
        ],
      })
    );
    const details: FundedRunDetails = {
      preflight: {
        ready: true,
        transactionsSubmitted: 0,
        checks: [{ scope: "all", check: "gas", ok: true, detail: "under the ceiling" }],
        cases: [],
        verification: "read-only",
      },
      cleanupError: "Gas exceeds ceiling",
    };
    await writeFundedReport(
      {
        directory,
        snapshot: async () => {
          throw new Error("RPC unavailable");
        },
      },
      [],
      details
    );
    for (const path of [join(directory, "report-report-test.json"), "test-results/funded/cost-report.json"]) {
      const saved = JSON.parse(await readFile(path, "utf8"));
      assert.deepEqual(saved.preflight, details.preflight);
      assert.equal(saved.cleanupCompleted, false);
      assert.equal(saved.cleanupError, details.cleanupError);
      assert.equal(saved.positions, undefined);
      assert.deepEqual(saved.cases[0].failures, [
        { purpose: "ui:create", requestId: "request", reason: "Relay fee quote was insufficient" },
      ]);
    }
  } finally {
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  }
});
