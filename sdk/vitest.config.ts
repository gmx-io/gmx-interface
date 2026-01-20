import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    exclude: [
      "**/build/**",
      "**/node_modules/**",
      "**/clients/v1/modules/markets/markets.spec.ts",
      "**/clients/v1/modules/tokens/tokens.spec.ts",
      "**/clients/v1/modules/positions/positions.spec.ts",
      "**/clients/v1/modules/orders/orders.spec.ts",
      "**/clients/v1/modules/orders/helpers.spec.ts",
      "**/clients/v1/modules/trades/trades.spec.ts",
    ],
  },
  resolve: {
    alias: {
      configs: path.resolve(__dirname, "./src/configs"),
      utils: path.resolve(__dirname, "./src/utils"),
      codegen: path.resolve(__dirname, "./src/codegen"),
      abis: path.resolve(__dirname, "./src/abis"),
      clients: path.resolve(__dirname, "./src/clients"),
    },
  },
});
