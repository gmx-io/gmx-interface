import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: process.env.PW_TIMEOUT ? Number(process.env.PW_TIMEOUT) : 60_000,
  testDir: "./src/tests",
  testMatch: "*.spec.ts",
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,
  use: {
    viewport: { width: 1600, height: 1200 },
  },
};

export default config;
