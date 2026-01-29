/// <reference types="vitest" />

import { lingui } from "@lingui/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type PluginOption } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";
import { BREAKPOINTS } from "./src/lib/breakpoints";

export default defineConfig(({ mode }) => {
  return {
    worker: {
      format: "es",
    },
    optimizeDeps: {
      include: ["@vanilla-extract/sprinkles", "@rainbow-me/rainbowkit"],
      esbuildOptions: {
        target: "es2020",
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            $screen-md: ${BREAKPOINTS.mobile}px;
            $screen-lg: ${BREAKPOINTS.tablet}px;
            $screen-xl: ${BREAKPOINTS.desktop}px;
            $screen-sm: ${BREAKPOINTS.smallMobile}px;
          `,
        },
      },
    },
    plugins: [
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
      visualizer() as PluginOption,
      mode === "analyze" && analyzer(),
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
    build: {
      assetsInlineLimit: 0,
      outDir: "build",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            web3: ["ethers", "viem", "date-fns", "@rainbow-me/rainbowkit", "lodash", "@gelatonetwork/relay-sdk"],
            charts: ["recharts"],
            ui: ["@headlessui/react", "framer-motion", "react-select"],
          },
        },
      },
    },
    test: {
      environment: "happy-dom",
      globalSetup: "./vitest.global-setup.js",
      exclude: ["./autotests", "node_modules", "./sdk"],
      setupFiles: ["./src/lib/polyfills.ts", "@vitest/web-worker"],
      server: {
        deps: {
          inline: ["@vanilla-extract/sprinkles", "@rainbow-me/rainbowkit"],
        },
      },
    },
  };
});
