import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    exclude: ["**/build/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      configs: path.resolve(__dirname, "./src/configs"),
      modules: path.resolve(__dirname, "./src/modules"),
      utils: path.resolve(__dirname, "./src/utils"),
      types: path.resolve(__dirname, "./src/types"),
      prebuilt: path.resolve(__dirname, "./src/prebuilt/index.ts"),
      abis: path.resolve(__dirname, "./src/abis"),
    },
  },
});
