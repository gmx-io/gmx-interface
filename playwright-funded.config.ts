import { defineConfig } from "@playwright/test";
import process from "node:process";

import regression from "./playwright-regression.config";

if (!process.env.REGRESSION_FUNDED_RUN_ID || process.env.REGRESSION_FUNDED_EXECUTE !== "1") {
  throw new Error("Use the funded runner so the wallet lock, journal and final cleanup are active");
}

export default defineConfig<object, { chainId: number }>({
  ...regression,
  tsconfig: "./autotests/regression/funded/tsconfig.json",
  workers: 1,
  fullyParallel: false,
  maxFailures: 1,
  retries: 2,
  timeout: 180_000,
  outputDir: "test-results/funded",
  reporter: [
    ["./autotests/regression/funded/consoleReporter.ts"],
    ["html", { outputFolder: "playwright-report/funded", open: "never" }],
    ["json", { outputFile: "test-results/funded/playwright.json" }],
  ],
  projects: [{ name: "funded", testMatch: "funded/journeys.spec.ts" }],
  use: {
    ...regression.use,
    chainId: 42161,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  metadata: {
    ...regression.metadata,
    fundedRunId: process.env.REGRESSION_FUNDED_RUN_ID,
    chainId: 42161,
    data: "17 UI-initiated journeys through a guarded wallet (finite approvals, relay requests re-sent from Node); independent receipt/state checks, shared budget; SDK cleanup after every scenario",
  },
});
