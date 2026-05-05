import { lingui } from "@lingui/vite-plugin";
import { defineConfig, devices } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import type { Plugin } from "vite";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite plugin that mocks modules whose top-level code has circular
 * dependency issues in the production bundle (TDZ errors).
 */
function ctModuleMocks(): Plugin {
  const mockPath = path.resolve(__dirname, "playwright/mocks/rpcDebug.ts");

  return {
    name: "ct-module-mocks",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "lib/rpc/_debug") {
        return mockPath;
      }
      // Relative import from within lib/rpc/
      if (source === "./_debug" && importer && importer.includes(path.join("lib", "rpc"))) {
        return mockPath;
      }
      if (source.includes("lib/rpc/_debug")) {
        return mockPath;
      }
    },
  };
}

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.ct.spec.tsx",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    ctViteConfig: {
      worker: {
        format: "es",
      },
      build: {
        // Reduce memory usage during CT builds
        sourcemap: false,
        minify: false,
      },
      plugins: [
        ctModuleMocks(),
        svgr({
          include: "**/*.svg?react",
        }),
        tsconfigPaths(),
        react({
          babel: {
            plugins: ["macros"],
          },
        }),
        lingui(),
      ],
      optimizeDeps: {
        include: ["@vanilla-extract/sprinkles", "@rainbow-me/rainbowkit"],
      },
      resolve: {
        alias: {
          App: path.resolve(__dirname, "src/App"),
          components: path.resolve(__dirname, "src/components"),
          config: path.resolve(__dirname, "src/config"),
          context: path.resolve(__dirname, "src/context"),
          domain: path.resolve(__dirname, "src/domain"),
          fonts: path.resolve(__dirname, "src/fonts"),
          img: path.resolve(__dirname, "src/img"),
          lib: path.resolve(__dirname, "src/lib"),
          ab: path.resolve(__dirname, "src/ab"),
          locales: path.resolve(__dirname, "src/locales"),
          pages: path.resolve(__dirname, "src/pages"),
          styles: path.resolve(__dirname, "src/styles"),
          prebuilt: path.resolve(__dirname, "src/prebuilt"),
          sdk: path.resolve(__dirname, "sdk/src"),
        },
      },
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumExecutablePath && {
          launchOptions: { executablePath: chromiumExecutablePath },
        }),
      },
    },
  ],
});
