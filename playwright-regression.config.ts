import { defineConfig, devices } from "@playwright/test";

if (process.env.CI && !process.env.REGRESSION_BASE_URL) {
  throw new Error("REGRESSION_BASE_URL is required in CI; resolve the PR deployment preview before running tests");
}

const baseURL = process.env.REGRESSION_BASE_URL || "https://test.gmx-interface.pages.dev";
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
  workers: 3,
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
    data: "live HTTP data; connected-state uses a mock wallet and empty event stream",
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
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "ui", testMatch: "ui/*.spec.ts" },
    { name: "connected-state", testMatch: "connected-state/*.spec.ts" },
    { name: "gates", testMatch: "gates/*.spec.ts" },
  ],
});
