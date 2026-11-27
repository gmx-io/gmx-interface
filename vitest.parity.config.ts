import { defineConfig } from "vitest/config";

import { createViteConfig } from "./vite.config";

export default defineConfig((env) => {
  const config = createViteConfig(env);

  return {
    ...config,
    test: {
      ...config.test,
      // one unisolated worker for every parity file instead of the app's isolated and shared projects
      projects: undefined,
      // no CORS preflight, which doubles the RPC requests and fails on rate limits
      environmentOptions: { happyDOM: { settings: { fetch: { disableSameOriginPolicy: true } } } },
      include: ["src/**/*.parity.spec.ts"],
      exclude: ["node_modules"],
      hookTimeout: 300_000,
      fileParallelism: false,
      isolate: false,
      reporters: ["verbose"],
    },
  };
});
