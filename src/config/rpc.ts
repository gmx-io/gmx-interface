import sample from "lodash/sample";

import { _debugRpcTracker, RpcDebugFlags } from "lib/rpc/_debug";
import { RpcTrackerConfig } from "lib/rpc/RpcTracker";
import { RpcConfig } from "lib/rpc/types";
import { mustNeverExist } from "lib/types";
import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "sdk/configs/chains";

import { isDevelopment } from "./env";

export type { RpcConfig } from "lib/rpc/types";
export * from "sdk/configs/chains";
export { getChainName } from "sdk/configs/chains";

const ENV_ARBITRUM_RPC_URLS = parseRpcUrlsFromEnv(import.meta.env.VITE_APP_ARBITRUM_RPC_URLS);

const ENV_AVALANCHE_RPC_URLS = parseRpcUrlsFromEnv(import.meta.env.VITE_APP_AVALANCHE_RPC_URLS);

const ENV_BOTANIX_RPC_URLS = parseRpcUrlsFromEnv(import.meta.env.VITE_APP_BOTANIX_RPC_URLS);

// Chains that support Alchemy WebSocket endpoints
const ALCHEMY_WS_SUPPORT_CHAINS = [
  ARBITRUM,
  BOTANIX,
  ARBITRUM_SEPOLIA,
  SOURCE_BASE_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
];

export const RPC_TRACKER_CONFIG_FOR_CONTRACTS_CHAINS: RpcTrackerConfig = {
  trackInterval: 10 * 1000, // 10 sec
  delay: 5000, // 5 sec
  checkTimeout: 10 * 1000, // 10 sec
  cacheTimeout: 5 * 60 * 1000, // 5 min
  disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 min
  failuresBeforeBan: {
    count: 3,
    window: 60 * 1000, // 1 min
    throttle: 2 * 1000,
  },
  setEndpointsThrottle: 5 * 1000, // 5 sec
  blockFromFutureThreshold: 1000,
  blockLaggingThreshold: 50,
};

export const RPC_TRACKER_CONFIG_FOR_SOURCE_CHAINS: RpcTrackerConfig = {
  trackInterval: 20 * 1000, // 20 sec
  delay: 5000, // 5 sec
  checkTimeout: 10 * 1000, // 10 sec
  cacheTimeout: 5 * 60 * 1000, // 5 min
  disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 min
  failuresBeforeBan: {
    count: 3,
    window: 60 * 1000, // 1 min
    throttle: 2 * 1000,
  },
  setEndpointsThrottle: 5 * 1000, // 5 sec
  blockFromFutureThreshold: 1000,
  blockLaggingThreshold: 50,
};

const RPC_CONFIGS: Record<number, RpcConfig[]> = {
  [ARBITRUM]: [
    ...[
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one-rpc.publicnode.com",
      // "https://1rpc.io/arb", has CORS issue
      "https://arbitrum-one.public.blastapi.io",
      // "https://arbitrum.drpc.org",
      // "https://rpc.ankr.com/arbitrum",
    ].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    ...(ENV_ARBITRUM_RPC_URLS
      ? ENV_ARBITRUM_RPC_URLS.map((url: string) => ({
          url,
          isPublic: false,
          purpose: "fallback",
        }))
      : [getAlchemyProvider(ARBITRUM, "fallback")]),

    // Large account
    getAlchemyProvider(ARBITRUM, "largeAccount"),

    // Express
    getAlchemyProvider(ARBITRUM, "express"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(ARBITRUM) ?? []),
  ],
  [AVALANCHE]: [
    ...["https://api.avax.network/ext/bc/C/rpc"].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    ...(ENV_AVALANCHE_RPC_URLS
      ? ENV_AVALANCHE_RPC_URLS.map((url: string) => ({
          url,
          isPublic: false,
          purpose: "fallback",
        }))
      : [getAlchemyProvider(AVALANCHE, "fallback")]),

    // Large account
    getAlchemyProvider(AVALANCHE, "largeAccount"),

    // Express
    getAlchemyProvider(AVALANCHE, "express"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(AVALANCHE) ?? []),
  ],
  [AVALANCHE_FUJI]: [
    ...["https://avalanche-fuji-c-chain.publicnode.com", "https://api.avax-test.network/ext/bc/C/rpc"].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    ...[
      "https://endpoints.omniatech.io/v1/avax/fuji/public",
      "https://api.avax-test.network/ext/bc/C/rpc",
      "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
    ].map((url) => ({
      url,
      isPublic: false,
      purpose: "fallback",
    })),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(AVALANCHE_FUJI) ?? []),
  ],
  [ARBITRUM_SEPOLIA]: [
    ...[
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.drpc.org",
      "https://arbitrum-sepolia-rpc.publicnode.com",
    ].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    getAlchemyProvider(ARBITRUM_SEPOLIA, "fallback"),

    // Express
    getAlchemyProvider(ARBITRUM_SEPOLIA, "express"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(ARBITRUM_SEPOLIA) ?? []),
  ],
  [BOTANIX]: [
    ...["https://rpc.ankr.com/botanix_mainnet"].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    ...(ENV_BOTANIX_RPC_URLS
      ? ENV_BOTANIX_RPC_URLS.map((url: string) => ({
          url,
          isPublic: false,
          purpose: "fallback",
        }))
      : [getAlchemyProvider(BOTANIX, "fallback")]),

    // Large account
    getAlchemyProvider(BOTANIX, "largeAccount"),

    // Express
    getAlchemyProvider(BOTANIX, "express"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(BOTANIX) ?? []),
  ],

  // SOURCE CHAINS
  [SOURCE_BASE_MAINNET]: [
    ...[
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
      "https://base-rpc.publicnode.com",
      "https://base.drpc.org",
    ].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    getAlchemyProvider(SOURCE_BASE_MAINNET, "fallback"),

    // Large account
    getAlchemyProvider(SOURCE_BASE_MAINNET, "largeAccount"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(SOURCE_BASE_MAINNET) ?? []),
  ],
  [SOURCE_OPTIMISM_SEPOLIA]: [
    ...["https://sepolia.optimism.io", "https://optimism-sepolia.drpc.org", "https://optimism-sepolia.therpc.io"].map(
      (url) => ({
        url,
        isPublic: true,
        purpose: "default",
      })
    ),

    // Fallback
    getAlchemyProvider(SOURCE_OPTIMISM_SEPOLIA, "fallback"),

    // Large account
    getAlchemyProvider(SOURCE_OPTIMISM_SEPOLIA, "largeAccount"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(SOURCE_OPTIMISM_SEPOLIA) ?? []),
  ],
  [SOURCE_SEPOLIA]: [
    ...["https://sepolia.drpc.org"].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    getAlchemyProvider(SOURCE_SEPOLIA, "fallback"),

    // Large account
    getAlchemyProvider(SOURCE_SEPOLIA, "largeAccount"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(SOURCE_SEPOLIA) ?? []),
  ],
  [SOURCE_BSC_MAINNET]: [
    ...[
      "https://bsc-dataseed.bnbchain.org",
      "https://1rpc.io/bnb",
      "https://bsc.drpc.org",
      "https://bsc-rpc.publicnode.com",
    ].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    getAlchemyProvider(SOURCE_BSC_MAINNET, "fallback"),

    // Large account
    getAlchemyProvider(SOURCE_BSC_MAINNET, "largeAccount"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(SOURCE_BSC_MAINNET) ?? []),
  ],

  // ADDITIONAL CHAINS
  [SOURCE_ETHEREUM_MAINNET]: [
    ...[
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
      "https://eth.drpc.org",
      "https://ethereum.publicnode.com",
    ].map((url) => ({
      url,
      isPublic: true,
      purpose: "default",
    })),

    // Fallback
    getAlchemyProvider(SOURCE_ETHEREUM_MAINNET, "fallback"),

    // Large account
    getAlchemyProvider(SOURCE_ETHEREUM_MAINNET, "largeAccount"),

    // Debug endpoints from settings
    ...(_debugRpcTracker?.getDebugRpcEndpoints(SOURCE_ETHEREUM_MAINNET) ?? []),
  ],
};

const WS_RPC_CONFIGS: Record<number, RpcConfig[]> = {
  [ARBITRUM]: [getAlchemyProvider(ARBITRUM, "fallback", "ws"), getAlchemyProvider(ARBITRUM, "largeAccount", "ws")],
  [AVALANCHE]: [{ url: "wss://api.avax.network/ext/bc/C/ws", isPublic: true, purpose: "fallback" }],
  [ARBITRUM_SEPOLIA]: [
    getAlchemyProvider(ARBITRUM_SEPOLIA, "fallback", "ws"),
    getAlchemyProvider(ARBITRUM_SEPOLIA, "largeAccount", "ws"),
  ],
  [BOTANIX]: [getAlchemyProvider(BOTANIX, "fallback", "ws"), getAlchemyProvider(BOTANIX, "largeAccount", "ws")],
  [SOURCE_BASE_MAINNET]: [
    getAlchemyProvider(SOURCE_BASE_MAINNET, "fallback", "ws"),
    getAlchemyProvider(SOURCE_BASE_MAINNET, "largeAccount", "ws"),
  ],
  [SOURCE_OPTIMISM_SEPOLIA]: [
    getAlchemyProvider(SOURCE_OPTIMISM_SEPOLIA, "fallback", "ws"),
    getAlchemyProvider(SOURCE_OPTIMISM_SEPOLIA, "largeAccount", "ws"),
  ],
  [SOURCE_SEPOLIA]: [
    getAlchemyProvider(SOURCE_SEPOLIA, "fallback", "ws"),
    getAlchemyProvider(SOURCE_SEPOLIA, "largeAccount", "ws"),
  ],
  [SOURCE_BSC_MAINNET]: [
    getAlchemyProvider(SOURCE_BSC_MAINNET, "fallback", "ws"),
    getAlchemyProvider(SOURCE_BSC_MAINNET, "largeAccount", "ws"),
  ],
  [SOURCE_ETHEREUM_MAINNET]: [
    getAlchemyProvider(SOURCE_ETHEREUM_MAINNET, "fallback", "ws"),
    getAlchemyProvider(SOURCE_ETHEREUM_MAINNET, "largeAccount", "ws"),
  ],
};

export function getRpcProviders(chainId: number, purpose: RpcPurpose): RpcConfig[] | [] {
  const config = RPC_CONFIGS[chainId];

  if (!config) {
    return [];
  }

  return config.filter((rpc) => rpc.purpose === purpose);
}

export function getWsRpcProviders(chainId: number, purpose: RpcPurpose): RpcConfig[] | [undefined] {
  const config = WS_RPC_CONFIGS[chainId];

  if (!config) {
    return [];
  }

  return config.filter((rpc) => rpc.purpose === purpose);
}

export function getFallbackRpcUrl(chainId: number, isLargeAccount: boolean): string | undefined {
  const fallbackProviders = getRpcProviders(chainId, isLargeAccount ? "largeAccount" : "fallback");
  return sample(fallbackProviders.map((rpc) => rpc.url));
}

export function getExpressRpcUrl(chainId: number): string | undefined {
  return sample(getRpcProviders(chainId, "express").map((rpc) => rpc.url));
}

export type RpcPurpose = "fallback" | "largeAccount" | "express" | "default";

function getAlchemyProvider(
  chainId: Exclude<AnyChainId, typeof AVALANCHE_FUJI>,
  purpose: RpcPurpose,
  type: "http" | "ws" = "http"
): RpcConfig {
  if (type === "ws" && !ALCHEMY_WS_SUPPORT_CHAINS.includes(chainId)) {
    throw new Error(`WebSocket url is not supported for chainId: ${chainId}`);
  }

  let alchemyKey: string;

  if (isDevelopment() && !_debugRpcTracker?.getFlag(RpcDebugFlags.DebugAlchemy)) {
    alchemyKey = "EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
  } else {
    switch (purpose) {
      case "fallback":
        alchemyKey = "NnWkTZJp8dNKXlCIfJwej";
        break;
      case "largeAccount":
        alchemyKey = "UnfP5Io4K9X8UZnUnFy2a";
        break;
      case "express":
        alchemyKey = "vZoYuLP1GVpvE0wpgPKwC";
        break;
      case "default":
        throw new Error(`Unsupported purpose: ${purpose}`);
      default:
        mustNeverExist(purpose);
        throw new Error(`Unsupported purpose: ${purpose}`);
    }
  }

  let baseUrl: string;
  switch (chainId) {
    case ARBITRUM:
      baseUrl = `arb-mainnet.g.alchemy.com/v2`;
      break;
    case AVALANCHE:
      baseUrl = `avax-mainnet.g.alchemy.com/v2`;
      break;
    case BOTANIX:
      baseUrl = `botanix-mainnet.g.alchemy.com/v2`;
      break;
    case ARBITRUM_SEPOLIA:
      baseUrl = `arb-sepolia.g.alchemy.com/v2`;
      break;
    case SOURCE_BASE_MAINNET:
      baseUrl = `base-mainnet.g.alchemy.com/v2`;
      break;
    case SOURCE_OPTIMISM_SEPOLIA:
      baseUrl = `opt-sepolia.g.alchemy.com/v2`;
      break;
    case SOURCE_SEPOLIA:
      baseUrl = `eth-sepolia.g.alchemy.com/v2`;
      break;
    case SOURCE_BSC_MAINNET:
      baseUrl = `bnb-mainnet.g.alchemy.com/v2`;
      break;
    case SOURCE_ETHEREUM_MAINNET:
      baseUrl = `eth-mainnet.g.alchemy.com/v2`;
      break;
    default: {
      mustNeverExist(chainId);
      throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }

  const protocol = type === "ws" ? "wss" : "https";

  const url = `${protocol}://${baseUrl}/${alchemyKey}`;

  return {
    url,
    purpose,
    isPublic: false,
  };
}

const SELF_EXPLANATORY_HOSTNAMES = [
  "arb1.arbitrum.io",
  "api.avax.network",
  "api.avax-test.network",
  "sepolia-rollup.arbitrum.io",
];

export function getProviderNameFromUrl(rpcUrl: string) {
  try {
    const parsedUrl = new URL(rpcUrl);

    if (SELF_EXPLANATORY_HOSTNAMES.includes(parsedUrl.hostname)) {
      return parsedUrl.hostname;
    } else if (parsedUrl.hostname.endsWith(".alchemy.com")) {
      return parsedUrl.hostname;
    }

    if (parsedUrl.pathname === "/") {
      return parsedUrl.hostname;
    }

    return parsedUrl.hostname + parsedUrl.pathname;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Invalid rpc URL: ${rpcUrl}`);
  }

  return "unknown";
}

function parseRpcUrlsFromEnv(envValue: string | undefined): string[] | undefined {
  if (!envValue) {
    return undefined;
  }

  try {
    return JSON.parse(envValue);
  } catch (e) {
    return undefined;
  }
}
