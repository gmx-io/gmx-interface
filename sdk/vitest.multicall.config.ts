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
      "src/modules/markets/markets.spec.ts",
      "src/modules/tokens/tokens.spec.ts",
      "src/modules/positions/positions.spec.ts",
      "src/modules/orders/orders.spec.ts",
      "src/modules/orders/helpers.spec.ts",
      "src/modules/trades/trades.spec.ts",
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
