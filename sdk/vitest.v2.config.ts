import path from "path";
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// eslint-disable-next-line no-restricted-globals
const testEnv = loadEnv("test", process.cwd(), "");

// globalSetup runs outside the test environment, so it only sees process.env. Backfill the
// dotenv values there too, without shadowing what CI already provides.
for (const [key, value] of Object.entries(testEnv)) {
  // eslint-disable-next-line no-restricted-globals
  if (process.env[key] === undefined) process.env[key] = value;
}

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 90_000,
    fileParallelism: false,
    maxConcurrency: 1,
    include: ["src/clients/v2/__tests__/**/*.spec.ts"],
    exclude: ["**/build/**", "**/node_modules/**"],
    setupFiles: ["src/clients/v2/__tests__/setupAllowance.ts"],
    globalSetup: ["src/clients/v2/__tests__/globalCleanup.ts"],
    env: testEnv,
  },
  resolve: {
    alias: {
      configs: path.resolve(__dirname, "./src/configs"),
      utils: path.resolve(__dirname, "./src/utils"),
      codegen: path.resolve(__dirname, "./src/codegen"),
      abis: path.resolve(__dirname, "./src/abis"),
      clients: path.resolve(__dirname, "./src/clients"),
      test: path.resolve(__dirname, "./src/test"),
    },
  },
});
