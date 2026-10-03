import assert from "node:assert/strict";
import { test } from "node:test";

import { fundedBalanceValues, playwrightFailure } from "./report";
import { USD } from "./economy";
import type { FundedSession } from "./session";

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
