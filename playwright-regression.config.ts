import { defineConfig, devices } from "@playwright/test";

if (process.env.CI && !process.env.REGRESSION_BASE_URL) {
  throw new Error("REGRESSION_BASE_URL is required in CI; resolve the PR deployment preview before running tests");
}

const baseURL = process.env.REGRESSION_BASE_URL || "https://test.gmx-interface.pages.dev";
const landingURL = process.env.REGRESSION_LANDING_URL || "https://gmx.io";
if (process.env.CI && !process.env.REGRESSION_LANDING_URL) {
  throw new Error(
    "REGRESSION_LANDING_URL is required in CI; resolve the PR landing deployment preview before running tests"
  );
}
const chainId = Number(process.env.REGRESSION_CHAIN_ID || 42161);

if (![42161, 43114].includes(chainId)) {
  throw new Error("REGRESSION_CHAIN_ID must be 42161 (Arbitrum) or 43114 (Avalanche)");
}

export default defineConfig({
  testDir: "./autotests/regression",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 2,
  outputDir: "test-results/regression",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/regression", open: "never" }],
    ["json", { outputFile: "test-results/regression-results.json" }],
  ],
  metadata: {
    chainId,
    checkoutCommit: process.env.REGRESSION_COMMIT || process.env.GITHUB_SHA || "local",
    target: baseURL,
    landingTarget: landingURL,
    unavailableFeatures:
      chainId === 43114 ? ["GMX Account: unavailable on Avalanche; its scenarios run on Arbitrum"] : [],
    data: "live-state discovers public accounts with no API/RPC/price/flag/WebSocket mocks and a read-only provider; other projects: live public market data except fixed ETH market/price snapshots in unsigned form tests; mocked account flags, balances, positions, orders, histories and event stream; unsigned requests are rejected; funded UI rehearsals simulate transactions and receipts with a disposable signer, never the funded wallet; simulated RPC for gas guard",
    prNumber: process.env.REGRESSION_PR_NUMBER,
    deploymentCommit: process.env.REGRESSION_DEPLOYMENT_SHA,
    deploymentCheckUrl: process.env.REGRESSION_DEPLOYMENT_CHECK_URL,
    deployedCommitVerified: !!(process.env.REGRESSION_DEPLOYMENT_SHA && process.env.REGRESSION_DEPLOYMENT_CHECK_URL),
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    locale: "en-US",
    timezoneId: "UTC",
    testIdAttribute: "data-qa",
    serviceWorkers: "block",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    // one trace per failing test keeps CI artifacts small; its screencast replaces a video
    trace: "retain-on-first-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "ui", testMatch: "ui/*.spec.ts" },
    {
      name: "live-state",
      testMatch: "live-state/*.spec.ts",
      testIgnore: chainId === 43114 ? "live-state/gmxAccount*.spec.ts" : [],
      timeout: 180_000,
      workers: 1,
    },
    {
      name: "landing",
      testMatch: "landing/*.spec.ts",
      use: { baseURL: landingURL },
      ...(process.env.REGRESSION_BASELINE_DIR
        ? {
            snapshotPathTemplate: `${process.env.REGRESSION_BASELINE_DIR}/{arg}{ext}`,
            updateSnapshots: "none" as const,
          }
        : {}),
    },
    { name: "mobile", testMatch: "mobile/*.spec.ts", use: { ...devices["Pixel 7"] } },
    {
      name: "connected-state",
      testMatch: "connected-state/*.spec.ts",
      testIgnore: chainId === 43114 ? "connected-state/gmxAccount*.spec.ts" : [],
    },
    // The funded harness checks run from playwright-funded-harness.config.ts.
    { name: "gates", testMatch: "gates/*.spec.ts", testIgnore: "gates/gasGuard.spec.ts" },
  ],
});
