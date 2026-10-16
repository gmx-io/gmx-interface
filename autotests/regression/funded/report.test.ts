import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fundedBalanceValues, playwrightFailure, writeFundedReport, type FundedRunDetails } from "./report";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { writeJournal } from "./journal";

test("batch summaries show the final failed phase instead of the maximum-failures message", () => {
  const reason = "deposit: API request failed: POSITION_NOT_FOUND (status 400). Request details omitted.";
  const report = {
    errors: [{ message: "Testing stopped early after 1 maximum allowed failures." }],
    suites: [
      {
        suites: [
          {
            specs: [
              {
                tests: [
                  {
                    results: [
                      { status: "failed", errors: [{ message: "Error: connect read-only wallet: timeout" }] },
                      {
                        status: "failed",
                        errors: [{ message: `Error: \u001b[31m${reason}\u001b[39m\nStack trace omitted` }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  assert.equal(playwrightFailure(report), reason);
});

test("successful retries do not report a past failure as the final cause", () => {
  assert.equal(
    playwrightFailure({
      suites: [
        {
          specs: [
            {
              tests: [
                { results: [{ status: "failed", errors: [{ message: "first attempt" }] }, { status: "passed" }] },
              ],
            },
          ],
        },
      ],
    }),
    undefined
  );
});

test("batch error summaries redact sensitive details and handle errors outside tests", () => {
  const message = playwrightFailure({ errors: [{ message: "RPC at https://user:secret@example.test failed" }] });
  assert.ok(message);
  assert.doesNotMatch(message, /secret|example.test/);
  assert.equal(
    playwrightFailure({ errors: [{ message: "Worker stopped unexpectedly" }] }),
    "Worker stopped unexpectedly"
  );
  assert.equal(playwrightFailure({}), undefined);
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

for (const completed of [true, false]) {
  test(`cost reports retain preflight details and ${completed ? "cleanup results" : "cleanup errors"}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "gmx-funded-report-"));
    const cwd = process.cwd();
    try {
      process.chdir(directory);
      await writeJournal(directory, {
        version: 1,
        id: "report-test",
        chainId: 42161,
        address: "0x1111111111111111111111111111111111111111",
        marketAddress: "0x2222222222222222222222222222222222222222",
        createdAt: "now",
        initialNativeUsd: (50n * USD).toString(),
        initialStableUsd: (50n * USD).toString(),
        ownedPositionKeys: [],
        ownedOrderKeys: [],
        selectedCases: ["one-click"],
        actions: [
          {
            id: "failed-relay",
            purpose: "trigger",
            step: "one-click:create",
            requestId: "request",
            state: "failed",
            feeUsd: "1",
            failureReason: "Relay fee quote was insufficient",
          },
        ],
        completed,
        inventory: {
          "swap:WETH to USDC/settlement": JSON.stringify({ wrappedRefundAmount: { $bigint: "8842289841293" } }),
          "other/internal": "not a settlement",
        },
      });
      const details: FundedRunDetails = {
        preflight: {
          ready: true,
          transactionsSubmitted: 0,
          checks: [{ scope: "all", check: "gas", ok: true, detail: "under the ceiling" }],
          cases: [],
          verification: "read-only",
        },
        cleanup: completed ? { completed: true, alreadyClean: true } : undefined,
        cleanupError: completed ? undefined : "Gas exceeds ceiling",
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
        assert.equal(saved.cleanupCompleted, completed);
        assert.deepEqual(saved.cleanup, details.cleanup);
        assert.equal(saved.cleanupError, details.cleanupError);
        assert.equal(saved.positions, undefined);
        assert.deepEqual(saved.cases[0].failures, [
          {
            purpose: "trigger",
            requestId: "request",
            reason: "Relay fee quote was insufficient",
          },
        ]);
        assert.deepEqual(saved.swapSettlements, {
          "swap:WETH to USDC/settlement": { wrappedRefundAmount: { $bigint: "8842289841293" } },
        });
      }
    } finally {
      process.chdir(cwd);
      await rm(directory, { recursive: true, force: true });
    }
  });
}
