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
      "@": path.resolve(__dirname, "src"),
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
