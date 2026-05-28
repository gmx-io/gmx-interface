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

function getNodeModulePackageName(id: string) {
  const nodeModulesPath = "node_modules/";
  const nodeModulesIndex = id.lastIndexOf(nodeModulesPath);

  if (nodeModulesIndex === -1) {
    return undefined;
  }

  const modulePath = id.slice(nodeModulesIndex + nodeModulesPath.length);
  const parts = modulePath.split("/");

  if (parts[0]?.startsWith("@")) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0];
}

function getManualChunk(id: string) {
  if (id.includes("vite/preload-helper")) {
    return "preload";
  }

  if (id.includes("commonjsHelpers")) {
    return "commonjs";
  }

  const packageName = getNodeModulePackageName(id);

  if (!packageName) {
    return undefined;
  }

  if (packageName === "@babel/runtime") {
    return "babel-runtime";
  }

  if (packageName === "eventemitter3") {
    return "eventemitter";
  }

  if (
    packageName === "react" ||
    packageName === "react-dom" ||
    packageName === "react-router" ||
    packageName === "react-router-dom" ||
    packageName === "history" ||
    packageName === "path-to-regexp" ||
    packageName === "prop-types" ||
    packageName === "react-is" ||
    packageName === "scheduler" ||
    packageName === "tiny-invariant" ||
    packageName === "tiny-warning" ||
    packageName === "use-sync-external-store"
  ) {
    return "react";
  }

  if (packageName === "@tanstack/react-query") {
    return "query";
  }

  if (packageName === "tabbable") {
    return "ui";
  }

  if (
    packageName === "wagmi" ||
    packageName.startsWith("@wagmi/") ||
    packageName === "zustand" ||
    packageName === "mipd"
  ) {
    return "wagmi";
  }

  if (packageName.startsWith("@privy-io/") || packageName === "x402") {
    return "privy";
  }

  if (
    packageName.startsWith("@walletconnect/") ||
    packageName.startsWith("@reown/") ||
    packageName === "@coinbase/wallet-sdk" ||
    packageName === "@base-org/account" ||
    packageName === "porto"
  ) {
    return "walletconnect";
  }

  if (packageName === "jose" || packageName === "libphonenumber-js") {
    return "privy-auth";
  }

  if (
    packageName === "viem" ||
    packageName === "ox" ||
    packageName === "abitype" ||
    packageName.startsWith("@scure/") ||
    packageName.startsWith("@noble/")
  ) {
    return "viem";
  }

  if (packageName === "ethers") {
    return "ethers";
  }

  if (packageName === "@gelatocloud/gasless") {
    return "gelato";
  }

  if (packageName === "date-fns") {
    return "date-fns";
  }

  if (packageName === "lodash") {
    return "lodash";
  }

  if (packageName === "recharts") {
    return "charts";
  }

  if (packageName === "@headlessui/react" || packageName === "framer-motion" || packageName === "react-select") {
    return "ui";
  }

  return undefined;
}

export default defineConfig(({ mode }) => {
  return {
    worker: {
      format: "es",
    },
    optimizeDeps: {
      include: ["@vanilla-extract/sprinkles"],
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
        // Privy can reference Solana funding code even with walletChainType ethereum-only.
        "@solana-program/system": path.resolve(__dirname, "src/lib/privySolanaSystemStub.ts"),
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
          manualChunks: getManualChunk,
        },
      },
    },
    test: {
      environment: "happy-dom",
      globalSetup: "./vitest.global-setup.js",
      exclude: ["./autotests", "node_modules", "./sdk", "**/*.ct.spec.tsx"],
      setupFiles: ["./src/lib/polyfills.ts", "@vitest/web-worker"],
      server: {
        deps: {
          inline: ["@vanilla-extract/sprinkles"],
        },
      },
    },
  };
});
