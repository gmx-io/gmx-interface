import { defineConfig } from "@playwright/test";

import regression from "./playwright-regression.config";

const chainId = regression.metadata!.chainId as number;

export default defineConfig({
  ...regression,
  outputDir: "test-results/funded-harness",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/funded-harness", open: "never" }],
    ["json", { outputFile: "test-results/funded-harness-results.json" }],
  ],
  projects: [
    { name: "funded-gas-gate", testMatch: "gates/gasGuard.spec.ts" },
    { name: "funded-runtime", testMatch: "funded/runtime.spec.ts" },
    ...(chainId === 42161
      ? [{ name: "funded-ui-rehearsal", testMatch: "funded/uiTrading.spec.ts", fullyParallel: false }]
      : []),
    {
      name: "funded-browser",
      testMatch: ["funded/browser.spec.ts", "funded/uiWalletOrigin.spec.ts"],
      expect: { timeout: 1_000 },
      use: { actionTimeout: 1_000, navigationTimeout: 1_000 },
    },
  ],
  metadata: {
    ...regression.metadata,
    data: "funded harness safety, recovery and UI rehearsals with simulated transactions; no funded wallet",
  },
});
