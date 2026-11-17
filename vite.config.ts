/// <reference types="vitest" />

import { lingui } from "@lingui/vite-plugin";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import path from "path";
import type { ModuleInfo, OutputBundle, OutputChunk } from "rollup";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv, type ConfigEnv, type Plugin, type PluginOption, type UserConfig } from "vite";
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
const PWA_METADATA_PLACEHOLDER = "<!-- gmx-pwa-metadata -->";
const APP_REDIRECTS = "/ /trade 302\n";

function appRedirects(): PluginOption {
  return {
    name: "gmx-app-redirects",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "_redirects",
        source: APP_REDIRECTS,
      });
    },
  };
}

function getPwaBuildId(configuredBuildId: string | undefined) {
  if (configuredBuildId) {
    return configuredBuildId;
  }

  const commitTimestamp = execFileSync("git", ["show", "-s", "--format=%ct", "HEAD"], { encoding: "utf8" }).trim();

  // Preserve ordering with the millisecond build IDs used by existing installs.
  return `${commitTimestamp}000`;
}

function pwaMetadata(buildId: string, isEnabled: boolean): PluginOption {
  return {
    name: "gmx-pwa-metadata",
    transformIndexHtml(html) {
      const metadata = [
        `<meta name="gmx-pwa-build-id" content="${buildId}" />`,
        isEnabled ? '<meta name="gmx-pwa-enabled" content="true" />' : undefined,
      ]
        .filter(Boolean)
        .join("\n    ");

      return html.replace(PWA_METADATA_PLACEHOLDER, metadata);
    },
  };
}

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
  // Keep startup recovery independent of vendor chunks that can fail to load.
  if (normalizedId === "\0vite/preload-helper.js") {
    return "preload-helper";
  }

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

// sdk/node_modules has its own copies of these; bundling both breaks instanceof checks (e.g. ContractFunctionRevertedError)
const SDK_DEDUPED_PACKAGES = ["viem"];

function isSdkDedupedSource(source: string) {
  return SDK_DEDUPED_PACKAGES.some((packageName) => source === packageName || source.startsWith(`${packageName}/`));
}

function sdkDedupe(): PluginOption {
  const normalizedSdkSrcDir = normalizePath(SDK_SRC_DIR);
  const appResolverImporter = path.join(APP_SRC_DIR, "__sdk-dedupe.ts");

  return {
    name: "gmx-sdk-dedupe",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || !isSdkDedupedSource(source)) {
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

function isSolanaModule(id: string) {
  const srcDir = `${normalizePath(APP_SRC_DIR)}/`;
  const normalizedId = normalizePath(id).split("?")[0];
  return ["lib/solana", "domain/gmsol", "config/gmsol"].some(
    (folder) => normalizedId.startsWith(`${srcDir}${folder}/`) || normalizedId === `${srcDir}${folder}`
  );
}

function isSolanaPackage(source: string) {
  return (
    /^@(solana|solana-program|gmsol-labs)\//.test(source) ||
    source === "@privy-io/react-auth/solana" ||
    source.startsWith("@privy-io/react-auth/solana/")
  );
}

function isPrivySolanaModule(id: string) {
  return normalizePath(id).includes("/@privy-io/react-auth/dist/esm/solana.mjs");
}

function isWasm(id: string) {
  return /\.wasm(?:\?|$)/.test(id);
}

function findSolanaStaticImport(moduleInfo: ModuleInfo) {
  const srcDir = `${normalizePath(APP_SRC_DIR)}/`;
  if (!normalizePath(moduleInfo.id).startsWith(srcDir) || isSolanaModule(moduleInfo.id)) {
    return undefined;
  }

  // Check package specifiers before resolved IDs, which may point to aliases or virtual stubs.
  for (const statement of moduleInfo.ast!.body) {
    if (
      (statement.type === "ImportDeclaration" ||
        statement.type === "ExportNamedDeclaration" ||
        statement.type === "ExportAllDeclaration") &&
      statement.source &&
      isSolanaPackage(String(statement.source.value))
    ) {
      return String(statement.source.value);
    }
  }

  return moduleInfo.importedIds.find(
    (id) =>
      isSolanaModule(id) ||
      id === SOLANA_SYSTEM_STUB_ID ||
      getPackageNames(normalizePath(id)).some((packageName) => isSolanaPackage(`${packageName}/`)) ||
      isPrivySolanaModule(id)
  );
}

function* getStartupChunks(bundle: OutputBundle, requireAppBootstrap: boolean) {
  const bootstrapId = `${normalizePath(APP_SRC_DIR)}/App/bootstrap.tsx`;
  const bootstrapChunk = Object.values(bundle).find(
    (output) => output.type === "chunk" && Object.keys(output.modules).some((id) => normalizePath(id) === bootstrapId)
  );
  if (requireAppBootstrap && !bootstrapChunk) {
    throw new Error(
      "Solana build isolation: startup module src/App/bootstrap.tsx was not found. If it was renamed or moved, update the bootstrap path in vite.config.ts."
    );
  }
  // bootstrap is dynamically imported but always runs at startup, so it is also a root.
  const pending = Object.values(bundle)
    .filter((output) => output.type === "chunk" && (output.isEntry || output === bootstrapChunk))
    .map((output) => output.fileName);
  const visited = new Set<string>();

  while (pending.length) {
    const fileName = pending.pop()!;
    if (visited.has(fileName)) {
      continue;
    }
    visited.add(fileName);

    const chunk = bundle[fileName];
    if (!chunk || chunk.type !== "chunk") {
      continue;
    }

    yield chunk;
    // Follow static dependencies only; feature-gated lazy chunks may contain Solana code.
    pending.push(...chunk.imports);
  }
}

function getStartupChunkViolation(chunk: OutputChunk) {
  for (const id of Object.keys(chunk.modules)) {
    // Privy's root entry already includes ordinary @solana/* dependencies in the EVM bundle.
    if (
      isSolanaModule(id) ||
      getPackageNames(normalizePath(id)).includes("@gmsol-labs/gmsol-sdk") ||
      isPrivySolanaModule(id) ||
      isWasm(id)
    ) {
      return { kind: "module" as const, id };
    }
  }

  for (const asset of [...chunk.referencedFiles, ...(chunk.viteMetadata?.importedAssets ?? [])]) {
    if (isWasm(asset)) {
      return { kind: "asset" as const, id: asset };
    }
  }

  return undefined;
}

function formatModuleId(id: string) {
  return id.startsWith("\0")
    ? id.replace(/\0/g, "\\0")
    : normalizePath(path.isAbsolute(id) ? path.relative(__dirname, id) : id);
}

function solanaBuildIsolation({ requireAppBootstrap }: { requireAppBootstrap: boolean }): Plugin {
  return {
    name: "gmx-solana-build-isolation",
    apply: "build",
    moduleParsed(moduleInfo) {
      const importedId = findSolanaStaticImport(moduleInfo);
      if (importedId !== undefined) {
        this.error(`Solana static import is not allowed: ${moduleInfo.id} -> ${importedId}`);
      }
    },
    generateBundle(_, bundle) {
      for (const chunk of getStartupChunks(bundle, requireAppBootstrap)) {
        const violation = getStartupChunkViolation(chunk);
        if (violation) {
          if (violation.kind === "asset") {
            this.error(`WebAssembly asset in startup chunk ${chunk.fileName}: ${formatModuleId(violation.id)}`);
          }

          const importer = this.getModuleInfo(violation.id)?.importers[0];
          this.error(
            `Solana module in startup chunk ${chunk.fileName}: ${formatModuleId(violation.id)}` +
              (importer ? `\nImported by: ${formatModuleId(importer)}` : "")
          );
        }
      }
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

export function createViteConfig(
  { mode }: ConfigEnv,
  {
    emitAppRedirects = true,
    requireAppBootstrap = true,
  }: { emitAppRedirects?: boolean; requireAppBootstrap?: boolean } = {}
): UserConfig {
  const env = loadEnv(mode, process.cwd(), "");
  const pwaBuildId = getPwaBuildId(env.VITE_APP_PWA_GENERATION);

  const pwaGeneration = Number(pwaBuildId);
  if (!/^\d+$/.test(pwaBuildId) || !Number.isSafeInteger(pwaGeneration) || pwaGeneration <= 0) {
    throw new Error("VITE_APP_PWA_GENERATION must be a positive integer");
  }

  return {
    worker: {
      format: "es",
      plugins: () => [solanaBuildIsolation({ requireAppBootstrap: false })],
    },
    optimizeDeps: {
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
      emitAppRedirects && appRedirects(),
      pwaMetadata(pwaBuildId, env.VITE_APP_DISABLE_PWA !== "true"),
      svgr({
        include: "**/*.svg?react",
      }),
      solanaBuildIsolation({ requireAppBootstrap }),
      optionalSolanaSystemStub(),
      sdkDedupe(),
      tsconfigPaths({ projects: ["./tsconfig.json", "./landing/tsconfig.json", "./sdk/tsconfig.json"] }),
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
      // WebKit can retain failed modulepreloads across reloads: https://bugs.webkit.org/show_bug.cgi?id=270357
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    test: {
      environment: "happy-dom",
      globalSetup: "./vitest.global-setup.js",
      include: ["{src,landing}/**/*.{test,spec}.{js,jsx,ts,tsx}"],
      exclude: ["./autotests", "node_modules", "./sdk", "./.claude", "**/*.ct.spec.tsx"],
      setupFiles: ["./src/lib/polyfills.ts", "@vitest/web-worker"],
    },
  };
}

export default defineConfig((props) => createViteConfig(props));
