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

const REACT_VENDOR_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-router",
  "react-router-dom",
  "scheduler",
  "use-sync-external-store",
]);

const WEB3_PACKAGES = new Set([
  "abitype",
  "ethers",
  "isows",
  "ox",
  "viem",
  "@gelatocloud/gasless",
  "@layerzerolabs/lz-v2-utilities",
  "@stargatefinance/stg-evm-sdk-v2",
  "@uniswap/sdk-core",
  "@uniswap/v3-sdk",
]);

const UI_PACKAGES = new Set([
  "@floating-ui/dom",
  "@floating-ui/react",
  "@floating-ui/utils",
  "@headlessui/react",
  "framer-motion",
  "react-select",
]);

const UTILITY_VENDOR_PACKAGES = new Set(["@date-fns/tz", "date-fns", "lodash"]);
const WEB3_SHARED_SCOPES = new Set(["@noble", "@scure"]);
const UI_SHARED_SCOPES = new Set(["@floating-ui"]);

const APP_SRC_DIR = path.resolve(__dirname, "src");
const SDK_SRC_DIR = path.resolve(__dirname, "sdk/src");
const SOLANA_SYSTEM_MODULE_ID = "@solana-program/system";
const SOLANA_SYSTEM_STUB_ID = "\0gmx:solana-system-stub";

function normalizePath(id: string) {
  return id.replace(/\\/g, "/");
}

function getPackageNameFromPath(pathAfterNodeModules: string) {
  const [firstPart, secondPart] = pathAfterNodeModules.split("/");

  if (!firstPart) {
    return undefined;
  }

  return firstPart.startsWith("@") ? `${firstPart}/${secondPart}` : firstPart;
}

function getPackageNames(normalizedId: string) {
  return normalizedId
    .split("/node_modules/")
    .slice(1)
    .map(getPackageNameFromPath)
    .filter((packageName): packageName is string => Boolean(packageName));
}

function getPackageScope(packageName: string) {
  return packageName.startsWith("@") ? packageName.split("/")[0] : undefined;
}

function isSharedWeb3Package(packageName: string) {
  const packageScope = getPackageScope(packageName);
  return Boolean(packageScope && WEB3_SHARED_SCOPES.has(packageScope));
}

function isUiPackage(packageName: string) {
  const packageScope = getPackageScope(packageName);
  return UI_PACKAGES.has(packageName) || Boolean(packageScope && UI_SHARED_SCOPES.has(packageScope));
}

function manualChunks(id: string) {
  const normalizedId = normalizePath(id);
  const packageNames = getPackageNames(normalizedId);
  const packageName = packageNames.at(-1);

  if (!packageName) {
    return undefined;
  }

  if (isSharedWeb3Package(packageName)) {
    return "web3";
  }

  if (isUiPackage(packageName)) {
    return "ui";
  }

  if (REACT_VENDOR_PACKAGES.has(packageName)) {
    return "react-vendor";
  }

  if (WEB3_PACKAGES.has(packageName)) {
    return "web3";
  }

  if (UTILITY_VENDOR_PACKAGES.has(packageName)) {
    return "utility-vendor";
  }

  if (packageName === "recharts") {
    return "charts";
  }

  if (isUiPackage(packageName)) {
    return "ui";
  }

  return undefined;
}

function sdkViemDedupe(): PluginOption {
  const normalizedSdkSrcDir = normalizePath(SDK_SRC_DIR);
  const appResolverImporter = path.join(APP_SRC_DIR, "__sdk-viem-dedupe.ts");

  return {
    name: "gmx-sdk-viem-dedupe",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || (source !== "viem" && !source.startsWith("viem/"))) {
        return null;
      }

      const normalizedImporter = normalizePath(importer);

      if (!normalizedImporter.includes(`${normalizedSdkSrcDir}/`)) {
        return null;
      }

      return this.resolve(source, appResolverImporter, {
        ...options,
        skipSelf: true,
      });
    },
  };
}

function optionalSolanaSystemStub(): PluginOption {
  return {
    name: "gmx-optional-solana-system-stub",
    enforce: "pre",
    resolveId(source) {
      if (source === SOLANA_SYSTEM_MODULE_ID) {
        return SOLANA_SYSTEM_STUB_ID;
      }

      return null;
    },
    load(id) {
      if (id !== SOLANA_SYSTEM_STUB_ID) {
        return null;
      }

      return `
        export function getTransferSolInstruction() {
          throw new Error("${SOLANA_SYSTEM_MODULE_ID} is not bundled in the GMX ethereum-only build.");
        }
      `;
    },
  };
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
      optionalSolanaSystemStub(),
      sdkViemDedupe(),
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
          manualChunks,
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
