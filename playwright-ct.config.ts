import { lingui } from "@lingui/vite-plugin";
import { defineConfig, devices } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import svgr from "vite-plugin-svgr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    trace: "on-first-retry",
    ctViteConfig: {
      plugins: [
        svgr({
          include: "**/*.svg?react",
        }),
        react({
          babel: {
            plugins: ["macros"],
          },
        }),
        lingui(),
      ],
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
