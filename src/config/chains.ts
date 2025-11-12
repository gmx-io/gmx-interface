import sample from "lodash/sample";

import { mustNeverExist } from "lib/types";
import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  ContractsChainId,
  ETH_MAINNET,
  CONTRACTS_CHAIN_IDS as SDK_CONTRACTS_CHAIN_IDS,
  CONTRACTS_CHAIN_IDS_DEV as SDK_CONTRACTS_CHAIN_IDS_DEV,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SourceChainId,
} from "sdk/configs/chains";

import { isDevelopment } from "./env";

export * from "sdk/configs/chains";
export { getChainName } from "sdk/configs/chains";

export const CONTRACTS_CHAIN_IDS: readonly number[] = isDevelopment()
  ? SDK_CONTRACTS_CHAIN_IDS_DEV
  : SDK_CONTRACTS_CHAIN_IDS;

export const ENV_ARBITRUM_RPC_URLS = import.meta.env.VITE_APP_ARBITRUM_RPC_URLS;
export const ENV_AVALANCHE_RPC_URLS = import.meta.env.VITE_APP_AVALANCHE_RPC_URLS;
export const ENV_BOTANIX_RPC_URLS = import.meta.env.VITE_APP_BOTANIX_RPC_URLS;

const ALCHEMY_WHITELISTED_DOMAINS = ["gmx.io", "app.gmx.io", "gmxapp.io", "gmxalt.io"];

export type RpcConfig = {
  url: string;
  isPublic: boolean;
  purpose: string;
  type: "http" | "ws";
};

export type ContractChainRpcConfig = {
  default: string[];
  fallback: string[];
  largeAccount: string[];
  express: string[];
};

export type SourceChainRpcConfig = {
  default: string[];
  fallback: string[];
  largeAccount: string[];
};

const CONTRACTS_CHAIN_RPC_CONFIGS = {
  [ARBITRUM]: {
    default: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one-rpc.publicnode.com",
      // "https://1rpc.io/arb", has CORS issue
      "https://arbitrum-one.public.blastapi.io",
      // "https://arbitrum.drpc.org",
      "https://rpc.ankr.com/arbitrum",
    ],
    fallback: ENV_ARBITRUM_RPC_URLS
      ? JSON.parse(ENV_ARBITRUM_RPC_URLS)
      : [getAlchemyProvider(ARBITRUM, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(ARBITRUM, "http", "largeAccount").url],
    express: [getAlchemyProvider(ARBITRUM, "http", "express").url],
  },
  [AVALANCHE]: {
    default: ["https://api.avax.network/ext/bc/C/rpc"],
    fallback: [getAlchemyProvider(AVALANCHE, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(AVALANCHE, "http", "largeAccount").url],
    express: [getAlchemyProvider(AVALANCHE, "http", "express").url],
  },
  [AVALANCHE_FUJI]: {
    default: ["https://avalanche-fuji-c-chain.publicnode.com", "https://api.avax-test.network/ext/bc/C/rpc"],
    fallback: [
      "https://endpoints.omniatech.io/v1/avax/fuji/public",
      "https://api.avax-test.network/ext/bc/C/rpc",
      "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
    ],
    largeAccount: [],
    express: [],
  },
  [ARBITRUM_SEPOLIA]: {
    default: [
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.drpc.org",
      "https://arbitrum-sepolia-rpc.publicnode.com",
    ],
    fallback: [getAlchemyProvider(ARBITRUM_SEPOLIA, "http", "fallback").url],
    largeAccount: [],
    express: [getAlchemyProvider(ARBITRUM_SEPOLIA, "http", "express").url],
  },
  [BOTANIX]: {
    default: ["https://rpc.ankr.com/botanix_mainnet"],
    fallback: ENV_BOTANIX_RPC_URLS
      ? JSON.parse(ENV_BOTANIX_RPC_URLS)
      : [getAlchemyProvider(BOTANIX, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(BOTANIX, "http", "largeAccount").url],
    express: [getAlchemyProvider(BOTANIX, "http", "express").url],
  },
} as const satisfies Record<ContractsChainId, ContractChainRpcConfig>;

const SOURCE_CHAIN_RPC_CONFIGS = {
  [SOURCE_BASE_MAINNET]: {
    default: [
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
      "https://base-rpc.publicnode.com",
      "https://base.drpc.org",
    ],
    fallback: [getAlchemyProvider(SOURCE_BASE_MAINNET, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(SOURCE_BASE_MAINNET, "http", "largeAccount").url],
  },
  [SOURCE_OPTIMISM_SEPOLIA]: {
    default: ["https://sepolia.optimism.io", "https://optimism-sepolia.drpc.org", "https://optimism-sepolia.therpc.io"],
    fallback: [getAlchemyProvider(SOURCE_OPTIMISM_SEPOLIA, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(SOURCE_OPTIMISM_SEPOLIA, "http", "largeAccount").url],
  },
  [SOURCE_SEPOLIA]: {
    default: ["https://sepolia.drpc.org"],
    fallback: [getAlchemyProvider(SOURCE_SEPOLIA, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(SOURCE_SEPOLIA, "http", "largeAccount").url],
  },
  [SOURCE_BSC_MAINNET]: {
    default: [
      "https://bsc-dataseed.bnbchain.org",
      "https://1rpc.io/bnb",
      "https://bsc.drpc.org",
      "https://bsc-rpc.publicnode.com",
    ],
    fallback: [getAlchemyProvider(SOURCE_BSC_MAINNET, "http", "fallback").url],
    largeAccount: [getAlchemyProvider(SOURCE_BSC_MAINNET, "http", "largeAccount").url],
  },
} as const satisfies Record<SourceChainId, SourceChainRpcConfig>;

export const ADDITIONAL_RPC_CONFIGS = {
  [ETH_MAINNET]: {
    default: ["https://rpc.ankr.com/eth"],
  },
};

const ALL_RPC_CONFIGS = {
  ...CONTRACTS_CHAIN_RPC_CONFIGS,
  ...SOURCE_CHAIN_RPC_CONFIGS,
  ...ADDITIONAL_RPC_CONFIGS,
};

export function getRpcProviders(chainId: number, purpose: AlchemyKeyPurpose) {
  const providers = ALL_RPC_CONFIGS[chainId][purpose];

  return providers;
}

export function getFallbackRpcUrl(chainId: number, isLargeAccount: boolean): string {
  const fallbackProviders = getRpcProviders(chainId as AnyChainId, isLargeAccount ? "largeAccount" : "fallback");
  return sample(fallbackProviders);
}

export function getRandomOrDefaultRpcUrl(
  chainId: number,
  { isPublic, bannedUrls = [] }: { isPublic: boolean; bannedUrls?: string[] }
): string {
  const providers = getRpcProviders(chainId as AnyChainId, isPublic ? "default" : "largeAccount");
  const filteredProviders = providers.filter((url) => !bannedUrls.includes(url));

  let url = sample(filteredProviders);

  if (!url) {
    url = providers[0];
  }

  return url;
}

export function getExpressRpcUrl(chainId: number): string {
  return sample(getRpcProviders(chainId as AnyChainId, "express"));
}

type AlchemyKeyPurpose = "fallback" | "largeAccount" | "express" | "default";

function getAlchemyKey(purpose: AlchemyKeyPurpose) {
  if (ALCHEMY_WHITELISTED_DOMAINS.includes(self.location.host)) {
    if (purpose === "fallback") {
      return "NnWkTZJp8dNKXlCIfJwej";
    } else if (purpose === "largeAccount") {
      return "UnfP5Io4K9X8UZnUnFy2a";
    } else if (purpose === "express") {
      return "vZoYuLP1GVpvE0wpgPKwC";
    }
  }

  return "EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
}

export function getAlchemyProvider(
  chainId: Exclude<AnyChainId, typeof AVALANCHE_FUJI>,
  type: "http" | "ws",
  purpose: AlchemyKeyPurpose
) {
  let alchemyKey: string;

  if (ALCHEMY_WHITELISTED_DOMAINS.includes(self.location.host)) {
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
        alchemyKey = "EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
        break;
      default:
        mustNeverExist(purpose);
        throw new Error(`Unsupported purpose: ${purpose}`);
    }
  } else {
    alchemyKey = "EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
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
    default: {
      mustNeverExist(chainId);
      throw new Error(`Unsupported chainId: ${chainId}`);
    }
  }

  const url = `${type}://${baseUrl}/${alchemyKey}`;

  return {
    url,
    purpose,
    type,
  };
}

export function getAlchemyArbitrumHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://arb-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyAvalancheHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://avax-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyArbitrumWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://arb-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyBotanixHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://botanix-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyBotanixWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://botanix-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyOptimismSepoliaHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://opt-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyOptimismSepoliaWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://opt-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyArbitrumSepoliaHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://arb-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyArbitrumSepoliaWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://arb-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyBaseMainnetHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://base-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyBaseMainnetWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://base-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyBscMainnetHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://bnb-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemyBscMainnetWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://bnb-mainnet.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemySepoliaHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://eth-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemySepoliaWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://eth-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}
