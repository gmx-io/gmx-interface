import path from "path";
import { defineConfig } from "vitest/config";

// E2E specs spin up real sockets/servers; they run only in the dedicated CI step
// (`yarn test:e2e`), not in the default `test:ci` suite the pre-push hook runs.
export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    include: ["src/**/*.e2e.spec.ts"],
    exclude: ["**/build/**", "**/node_modules/**"],
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
