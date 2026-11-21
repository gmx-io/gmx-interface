import path from "node:path";
import { loadEnv } from "vite";

import { enableSolanaNetwork } from "./abFlagConfiguration.mjs";

export function playgroundConfiguration(root) {
  const env = loadEnv("playground", root, "PLAYGROUND_");
  const names = [
    "PLAYGROUND_ALCHEMY_DEVELOPMENT_KEY",
    "PLAYGROUND_ALCHEMY_FALLBACK_KEY",
    "PLAYGROUND_ALCHEMY_LARGE_ACCOUNT_KEY",
    "PLAYGROUND_ALCHEMY_EXPRESS_KEY",
  ];
  const keys = names.map((name) => {
    const value = env[name]?.trim();
    if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error(`Set ${name} in .env.playground.local or the build environment before starting playground`);
    }
    return value;
  });
  const rpcConfig = path.join(root, "src/config/rpc.ts");

  const alchemyOverride = () => ({
    name: "playground-alchemy-configuration",
    enforce: "pre",
    transform(source, id) {
      if (id.split("?")[0] !== rpcConfig) return;

      const prefixes = [
        /if \(isDevelopment\(\) && !_debugRpcTracker\?\.getFlag\(RpcDebugFlags.DebugAlchemy\)\) \{\s*alchemyKey = "[^"]+";/g,
        /case "fallback":\s*alchemyKey = "[^"]+";/g,
        /case "largeAccount":\s*alchemyKey = "[^"]+";/g,
        /case "express":\s*alchemyKey = "[^"]+";/g,
      ];
      if (
        [...source.matchAll(/alchemyKey = "[^"]+";/g)].length !== keys.length ||
        prefixes.some((pattern) => [...source.matchAll(pattern)].length !== 1)
      ) {
        this.error("The playground Alchemy override no longer matches src/config/rpc.ts");
      }
      let code = source;
      prefixes.forEach((pattern, index) => {
        code = code.replace(pattern, (match) =>
          match.replace(/alchemyKey = "[^"]+";/, () => `alchemyKey = ${JSON.stringify(keys[index])};`)
        );
      });
      return {
        code,
        map: { version: 3, names: [], sources: [id], sourcesContent: [code], mappings: "" },
      };
    },
  });

  return {
    mode: "playground",
    plugins: [
      enableSolanaNetwork(root),
      {
        name: "playground-alchemy-worker-configuration",
        config(config) {
          const workerPlugins = config.worker?.plugins;
          if (!config.worker) config.worker = {};
          config.worker.plugins = () => [...(workerPlugins?.() ?? []), alchemyOverride()];
        },
      },
      alchemyOverride(),
    ],
  };
}
