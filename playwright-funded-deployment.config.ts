import { defineConfig } from "@playwright/test";
import regression from "./playwright-regression.config";

export default defineConfig({
  ...regression,
  tsconfig: "./autotests/regression/funded/tsconfig.json",
  workers: 1,
  fullyParallel: false,
  retries: 2,
  timeout: 180_000,
  outputDir: "test-results/funded-deployment",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/funded-deployment", open: "never" }]],
  projects: [{ name: "funded-deployment", testMatch: "funded/deployment.spec.ts" }],
  use: {
    ...regression.use,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
});
