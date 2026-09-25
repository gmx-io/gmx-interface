import { defineConfig } from "@playwright/test";

import regression from "./playwright-regression.config";

export default defineConfig({
  ...regression,
  workers: 1,
  fullyParallel: false,
  outputDir: "test-results/funded-preflight",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/funded-preflight", open: "never" }],
    ["json", { outputFile: "test-results/funded-preflight-results.json" }],
  ],
  projects: [{ name: "funded-preflight", testMatch: "funded/preflight.spec.ts" }],
  use: { trace: "off", video: "off", screenshot: "off" },
  metadata: { ...regression.metadata, data: "live gas preflight only; no funded actions" },
});
