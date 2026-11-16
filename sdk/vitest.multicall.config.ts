import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 90000,
    fileParallelism: false,
    maxConcurrency: 1,
    exclude: ["**/build/**", "**/node_modules/**"],
    include: [
      "src/clients/v1/modules/markets/markets.spec.ts",
      "src/clients/v1/modules/tokens/tokens.spec.ts",
      "src/clients/v1/modules/positions/positions.spec.ts",
      "src/clients/v1/modules/orders/orders.spec.ts",
      "src/clients/v1/modules/orders/helpers.spec.ts",
      "src/clients/v1/modules/trades/trades.spec.ts",
    ],
  },
  resolve: {
    alias: {
      // Serve recorded keeper fixtures instead of live gmxinfra calls (FEDEV-4029)
      "cross-fetch": path.resolve(__dirname, "./src/test/mockCrossFetch.ts"),
      configs: path.resolve(__dirname, "./src/configs"),
      clients: path.resolve(__dirname, "./src/clients"),
      utils: path.resolve(__dirname, "./src/utils"),
      codegen: path.resolve(__dirname, "./src/codegen"),
      abis: path.resolve(__dirname, "./src/abis"),
      test: path.resolve(__dirname, "./src/test"),
    },
  },
});
