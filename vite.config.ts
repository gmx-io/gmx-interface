/// <reference types="vitest" />

import { defineConfig, type PluginOption } from 'vite';
import { visualizer } from "rollup-plugin-visualizer";
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from "vite-plugin-svgr";
import tsconfigPaths from 'vite-tsconfig-paths';
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  worker: {
    format: "es",
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
  ],
  resolve: {
    alias: {
      "abis": path.resolve(__dirname, "src/abis"),
      "App": path.resolve(__dirname, "src/App"),
      "components": path.resolve(__dirname, "src/components"),
      "config": path.resolve(__dirname, "src/config"),
      "context": path.resolve(__dirname, "src/context"),
      "domain": path.resolve(__dirname, "src/domain"),
      "fonts": path.resolve(__dirname, "src/fonts"),
      "img": path.resolve(__dirname, "src/img"),
      "lib": path.resolve(__dirname, "src/lib"),
      "locales": path.resolve(__dirname, "src/locales"),
      "pages": path.resolve(__dirname, "src/pages"),
      "styles": path.resolve(__dirname, "src/styles"),
      "typechain-types": path.resolve(__dirname, "src/typechain-types"),
      "prebuit": path.resolve(__dirname, "src/prebuilt"),
    },
  },
  build: {
    assetsInlineLimit: 0,
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'ethers',
            'viem',
            'date-fns',
            'recharts',
            '@rainbow-me/rainbowkit',
            'lodash',
          ]
        }
      }
    }
  },
  test: {
    environment: "happy-dom",
    globalSetup: './vitest.global-setup.js',
    exclude: [
      './autotests',
      'node_modules',
    ],
    setupFiles: [
      '@vitest/web-worker',
    ],
  }
});
