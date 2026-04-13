import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 90_000,
    fileParallelism: false,
    maxConcurrency: 1,
    include: ["src/clients/v2/__tests__/**/*.spec.ts"],
    exclude: ["**/build/**", "**/node_modules/**"],
    env: loadEnv("", process.cwd(), ""),
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
