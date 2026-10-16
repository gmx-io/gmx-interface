import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRunDigest, cleanError, summarizeChangedFiles, type PlaywrightReport } from "./runDigest";

const result = (status: string, message?: string) => ({
  status,
  duration: 1000,
  error: message ? { message } : undefined,
});

const report: PlaywrightReport = {
  config: { metadata: { chainId: 42161 } },
  stats: { duration: 600_000 },
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
        {
          title: "12.03 sort",
          file: "ui/pools.spec.ts",
          line: 20,
          tests: [
            {
              projectName: "ui",
              status: "flaky",
              expectedStatus: "passed",
              results: [result("timedOut", "page.goto timeout"), result("passed")],
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

test("digest keeps failures, flaky tests, known gaps and skips with cleaned errors", () => {
  const digest = buildRunDigest(report);
  assert.deepEqual(digest.counts, { expected: 1, unexpected: 1, flaky: 1, skipped: 1 });
  assert.equal(digest.durationMinutes, 10);
  assert.deepEqual(digest.failedChecklistRows, ["12.01", "23.12"]);
  assert.deepEqual(digest.failures, [
    {
      project: "ui",
      location: "ui/pools.spec.ts:10",
      title: "12.01 23.12 pools list every market",
      attempts: 2,
      error: "Expected 3",
    },
  ]);
  assert.deepEqual(digest.flaky, [{ project: "ui", title: "12.03 sort", firstError: "page.goto timeout" }]);
  assert.deepEqual(digest.knownGaps, ["connected-state: GM › 26.07 frozen order shows a status"]);
  assert.deepEqual(digest.skipped, [
    { project: "ui", title: "GM › 16.07 active competition", reason: "no competition is running" },
  ]);
  assert.equal(digest.stoppedEarly, false);
  assert.deepEqual(digest.notRun, { total: 0, byProject: {} });
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

test("long errors are truncated", () => {
  assert.equal(cleanError("x".repeat(20), 5), "xxxxx…");
});

test("changed files list app code before tests and CI, with counts past the cap", () => {
  const files = [
    ".github/workflows/pr-e2e.yml",
    "autotests/regression/ui/pools.spec.ts",
    "src/lib/multicall/Multicall.spec.ts",
    "src/lib/multicall/Multicall.ts",
    "src/components/Foo/__tests__/Foo.ct.spec.tsx",
    "playwright-regression.config.ts",
    "README.md",
    "src/components/TradeBox/TradeBox.tsx",
  ];
  assert.deepEqual(summarizeChangedFiles(files, 3), {
    total: 8,
    appFileCount: 2,
    files: ["src/lib/multicall/Multicall.ts", "src/components/TradeBox/TradeBox.tsx", ".github/workflows/pr-e2e.yml"],
  });
});
