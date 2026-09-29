import { defineConfig } from "@playwright/test";
import process from "node:process";

import regression from "./playwright-regression.config";

if (!process.env.REGRESSION_FUNDED_RUN_ID || process.env.REGRESSION_FUNDED_EXECUTE !== "1") {
  throw new Error("Use the funded runner so the wallet lock, journal and final cleanup are active");
}

export default defineConfig({
  ...regression,
  tsconfig: "./autotests/regression/funded/tsconfig.json",
  workers: 1,
  fullyParallel: false,
  retries: 2,
  timeout: 180_000,
  outputDir: "test-results/funded",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/funded", open: "never" }]],
  projects: [{ name: "funded", testMatch: "funded/trade.spec.ts" }],
  use: { ...regression.use, trace: "off", video: "off", screenshot: "only-on-failure" },
  metadata: {
    ...regression.metadata,
    chainId: 42161,
    data: "API-assisted funded setup; browser position assertions; bounded cleanup",
  },
});
