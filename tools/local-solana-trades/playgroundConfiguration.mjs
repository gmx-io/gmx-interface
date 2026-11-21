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

      const network = 'const network = chainId === SOLANA_NETWORK_ID ? "solana" : chainId;';
      const proxyUrl = "url: `${protocol}://rpc.gmx.io/${network}/${routePurpose}`,";
      if (
        source.split(network).length !== 2 ||
        source.split(proxyUrl).length !== 2 ||
        !source.includes("RpcDebugFlags.UseProductionRpcRoutes")
      ) {
        this.error("The playground Alchemy override no longer matches src/config/rpc.ts");
      }
      const code = source
        .replace(
          network,
          `const hosts: Partial<Record<AnyChainId | typeof SOLANA_NETWORK_ID, string>> = {
            [SOLANA_NETWORK_ID]: "solana-mainnet",
            [ARBITRUM]: "arb-mainnet",
            [AVALANCHE]: "avax-mainnet",
            [MEGAETH]: "megaeth-mainnet",
            [ARBITRUM_SEPOLIA]: "arb-sepolia",
            [SOURCE_BASE_MAINNET]: "base-mainnet",
            [SOURCE_OPTIMISM_SEPOLIA]: "opt-sepolia",
            [SOURCE_SEPOLIA]: "eth-sepolia",
            [SOURCE_BSC_MAINNET]: "bnb-mainnet",
            [SOURCE_ETHEREUM_MAINNET]: "eth-mainnet",
          };
          const host = hosts[chainId];
          if (!host) throw new Error(\`Unsupported playground Alchemy chain: \${chainId}\`);
          const alchemyKeys = ${JSON.stringify({ dev: keys[0], fallback: keys[1], largeAccount: keys[2], express: keys[3] })};
          const alchemyKey = alchemyKeys[routePurpose];`
        )
        .replace(proxyUrl, "url: `${protocol}://${host}.g.alchemy.com/v2/${alchemyKey}`,");
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
