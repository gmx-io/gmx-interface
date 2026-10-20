import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRunDigest, type PlaywrightReport } from "./runDigest";

const result = (status: string, message?: string) => ({
  status,
  duration: 1000,
  error: message ? { message } : undefined,
});

const report: PlaywrightReport = {
  config: {},
  suites: [
    {
      title: "ui/pools.spec.ts",
      specs: [
        {
          title: "12.01 23.12 pools list every market",
          file: "ui/pools.spec.ts",
          line: 10,
          tests: [
            {
              projectName: "ui",
              status: "unexpected",
              expectedStatus: "passed",
              results: [result("failed", "first"), result("failed", "\u001b[31mExpected 3\u001b[39m")],
            },
          ],
        },
      ],
      suites: [
        {
          title: "GM",
          specs: [
            {
              title: "26.07 frozen order shows a status",
              file: "connected-state/failureStates.spec.ts",
              line: 5,
              tests: [{ projectName: "connected-state", status: "expected", expectedStatus: "failed", results: [] }],
            },
            {
              title: "16.07 active competition",
              file: "ui/competitions.spec.ts",
              line: 3,
              tests: [
                {
                  projectName: "ui",
                  status: "skipped",
                  expectedStatus: "skipped",
                  annotations: [{ type: "skip", description: "no competition is running" }],
                  results: [result("skipped")],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test("digest keeps failures with cleaned errors, known gaps and skip reasons", () => {
  const digest = buildRunDigest(report);
  assert.deepEqual(digest.counts, { expected: 1, unexpected: 1, flaky: 0, skipped: 1 });
  assert.deepEqual(digest.failedChecklistRows, ["12.01", "23.12"]);
  assert.equal(digest.failures[0].error, "Expected 3");
  assert.deepEqual(digest.knownGaps, ["connected-state: GM › 26.07 frozen order shows a status"]);
  assert.equal(digest.skipped[0].reason, "no competition is running");
  assert.equal(digest.stoppedEarly, false);
});

test("a run stopped at its failure limit reports the tests it did not run", () => {
  const stopped: PlaywrightReport = {
    config: {},
    errors: [{ message: "Testing stopped early after 20 maximum allowed failures." }],
    suites: [
      {
        title: "live-state/orders.spec.ts",
        specs: [
          {
            title: "9.01 orders",
            file: "live-state/orders.spec.ts",
            line: 4,
            tests: [
              { projectName: "live-state", status: "skipped", expectedStatus: "passed", results: [] },
              { projectName: "gates", status: "skipped", expectedStatus: "passed", results: [] },
            ],
          },
        ],
      },
    ],
  };
  const digest = buildRunDigest(stopped);
  assert.equal(digest.stoppedEarly, true);
  assert.deepEqual(digest.notRun, { total: 2, byProject: { "live-state": 1, gates: 1 } });
  assert.deepEqual(digest.skipped, []);
});
