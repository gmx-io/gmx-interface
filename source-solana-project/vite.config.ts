import { ConfigEnv, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { loadGMSOLDeployment } from './utils/load-deployment';
import { loadHttpsOptions } from './utils/load-https-options';
import { lingui } from '@lingui/vite-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { vitePluginGitCommit } from './utils/vite-plugin-git-commit';
import { vitePluginUiBuildInfo } from './utils/vite-plugin-ui-build-info';

const appPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string };

const localDevOverrideKeys = [
  'VITE_HELIUS_RPC_URL',
  'VITE_HELIUS_WSS_ENDPOINT',
];

function parseEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function applyLocalDevEnvOverrides(envDir: string) {
  const localEnvPath = path.resolve(envDir, '.env.local');

  if (!existsSync(localEnvPath)) {
    return;
  }

  const keysToOverride = new Set(localDevOverrideKeys);
  const localEnv = readFileSync(localEnvPath, 'utf8');

  for (const line of localEnv.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)?\s*$/);

    if (!match || !keysToOverride.has(match[1])) {
      continue;
    }

    process.env[match[1]] = parseEnvValue(match[2] ?? '');
  }
}

export default async ({ command, mode }: ConfigEnv) => {
  const envDir = process.cwd();

  if (command === 'serve') {
    applyLocalDevEnvOverrides(envDir);
  }

  const localDevOverrides =
    command === 'serve'
      ? Object.fromEntries(
          localDevOverrideKeys
            .filter((key) => process.env[key] !== undefined)
            .map((key) => [key, process.env[key]])
        )
      : {};

  const env = {
    ...loadEnv(mode, envDir, ''),
    ...localDevOverrides,
  };

  return {
    plugins: [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      svgr(),
      wasm(),
      topLevelAwait(),
      nodePolyfills({
        include: ['buffer', 'crypto', 'stream', 'vm', 'util', 'http', 'https'],
        globals: {
          global: false,
        },
      }),
      react({
        babel: {
          plugins: ['macros'],
          compact: mode == 'development' ? false : undefined,
        },
      }),
      lingui(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/cryptocurrency-icons/svg/icon/*',
            dest: 'icons',
          },
        ],
      }),
      vitePluginGitCommit({
        shortHash: true,
        includeTimestamp: true,
      }),
      vitePluginUiBuildInfo({
        appVersion: appPackageJson.version,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react-reconciler', 'react-reconciler/constants'],
    },
    define: {
      __GMSOL_DEPLOYMENT__: JSON.stringify(
        (await loadGMSOLDeployment(
          env.GMSOL_DEPLOYMENT
            ? path.resolve(__dirname, env.GMSOL_DEPLOYMENT)
            : undefined
        )) ?? null
      ),
    },
    server: {
      host: '0.0.0.0',
      https: await loadHttpsOptions(
        env.GMSOL_SSL_DIR
          ? path.resolve(__dirname, env.GMSOL_SSL_DIR)
          : undefined
      ),
    },
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          skipLibCheck: true,
        },
      },
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('/public/charting_library/')) {
              return 'charting-library';
            }

            if (id.includes('/client/dist/gmsol/')) {
              return 'gmsol-sdk';
            }

            if (
              id.includes('/node_modules/@apollo/') ||
              id.includes('/node_modules/graphql/') ||
              id.includes('/node_modules/graphql-ws/')
            ) {
              return 'apollo-vendor';
            }

            if (
              id.includes('/node_modules/recharts/') ||
              id.includes('/node_modules/recharts-scale/') ||
              id.includes('/node_modules/react-smooth/') ||
              id.includes('/node_modules/d3-') ||
              id.includes('/node_modules/victory-vendor/')
            ) {
              return 'charts-vendor';
            }

            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/') ||
              id.includes('/node_modules/react-router/') ||
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/@remix-run/router/')
            ) {
              return 'react-vendor';
            }

            if (id.includes('/node_modules/react-icons/')) {
              return 'icons-vendor';
            }

            if (
              id.includes('/node_modules/framer-motion/') ||
              id.includes('/node_modules/motion-dom/') ||
              id.includes('/node_modules/motion-utils/') ||
              id.includes('/node_modules/popmotion/')
            ) {
              return 'motion-vendor';
            }

            if (id.includes('/node_modules/lodash/')) {
              return 'lodash-vendor';
            }

            if (
              id.includes('/node_modules/zustand/') ||
              id.includes('/node_modules/immer/') ||
              id.includes('/node_modules/use-immer/') ||
              id.includes('/node_modules/use-context-selector/') ||
              id.includes('/node_modules/use-sync-external-store/') ||
              id.includes('/node_modules/reselect/') ||
              id.includes('/node_modules/swr/')
            ) {
              return 'state-vendor';
            }

            if (
              id.includes('/node_modules/swiper/') ||
              id.includes('/node_modules/react-calendar/')
            ) {
              return 'widgets-vendor';
            }

            if (
              id.includes('/node_modules/qrcode.react/') ||
              id.includes('/node_modules/html-to-image/')
            ) {
              return 'share-vendor';
            }

            if (id.includes('node_modules')) {
              return 'vendor';
            }

            return;
          },
        },
      },
      esbuild: {
        tsconfigRaw: {
          compilerOptions: {
            skipLibCheck: true,
          },
        },
      },
    },
  };
};
