import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    exclude: [
      "**/build/**",
      "**/node_modules/**",
      "**/modules/markets/markets.spec.ts",
      "**/modules/tokens/tokens.spec.ts",
      "**/modules/positions/positions.spec.ts",
      "**/modules/orders/orders.spec.ts",
      "**/modules/orders/helpers.spec.ts",
      "**/modules/trades/trades.spec.ts",
    ],
  },
  resolve: {
    alias: {
      configs: path.resolve(__dirname, "./src/configs"),
      modules: path.resolve(__dirname, "./src/modules"),
      utils: path.resolve(__dirname, "./src/utils"),
      types: path.resolve(__dirname, "./src/types"),
      prebuilt: path.resolve(__dirname, "./src/prebuilt/index.ts"),
      abis: path.resolve(__dirname, "./src/abis"),
      swap: path.resolve(__dirname, "./src/swap"),
    },
  },
});
