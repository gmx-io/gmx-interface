import { ethers } from "ethers";
import sample from "lodash/sample";

import {
  AnyChainId,
  ARBITRUM_SEPOLIA,
  BOTANIX,
  ContractsChainId,
  CONTRACTS_CHAIN_IDS as SDK_CONTRACTS_CHAIN_IDS,
  CONTRACTS_CHAIN_IDS_DEV as SDK_CONTRACTS_CHAIN_IDS_DEV,
  SOURCE_BASE_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "sdk/configs/chains";

import { isDevelopment } from "./env";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from "./static/chains";

export { CHAIN_NAMES_MAP, getChainName } from "sdk/configs/chains";
export * from "./static/chains";

export const CONTRACTS_CHAIN_IDS = isDevelopment() ? SDK_CONTRACTS_CHAIN_IDS_DEV : SDK_CONTRACTS_CHAIN_IDS;

const { parseEther } = ethers;

export const ENV_ARBITRUM_RPC_URLS = import.meta.env.VITE_APP_ARBITRUM_RPC_URLS;
export const ENV_AVALANCHE_RPC_URLS = import.meta.env.VITE_APP_AVALANCHE_RPC_URLS;
export const ENV_BOTANIX_RPC_URLS = import.meta.env.VITE_APP_BOTANIX_RPC_URLS;

// TODO take it from web3
export const DEFAULT_CHAIN_ID = ARBITRUM;
export const CHAIN_ID = DEFAULT_CHAIN_ID;

export const IS_NETWORK_DISABLED: Record<ContractsChainId, boolean> = {
  [ARBITRUM]: false,
  [AVALANCHE]: false,
  [ARBITRUM_SEPOLIA]: false,
  [AVALANCHE_FUJI]: false,
  [BOTANIX]: false,
};

export const NETWORK_EXECUTION_TO_CREATE_FEE_FACTOR = {
  [ARBITRUM]: 10n ** 29n * 5n,
  [AVALANCHE]: 10n ** 29n * 35n,
  [AVALANCHE_FUJI]: 10n ** 29n * 2n,
} as const;

const constants = {
  [ARBITRUM]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDC.e",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.000300001"),
  },

  [AVALANCHE]: {
    nativeTokenSymbol: "AVAX",
    wrappedTokenSymbol: "WAVAX",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0100001"),
  },

  [AVALANCHE_FUJI]: {
    nativeTokenSymbol: "AVAX",
    wrappedTokenSymbol: "WAVAX",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0100001"),
  },

  [ARBITRUM_SEPOLIA]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0100001"),
  },
  [BOTANIX]: {
    nativeTokenSymbol: "BTC",
    wrappedTokenSymbol: "PBTC",
    defaultCollateralSymbol: "USDC.E",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0100001"),
  },
} satisfies Record<ContractsChainId, Record<string, any>>;

const ALCHEMY_WHITELISTED_DOMAINS = ["gmx.io", "app.gmx.io"];

export const RPC_PROVIDERS: Record<AnyChainId | typeof ETH_MAINNET, string[]> = {
  [ETH_MAINNET]: ["https://rpc.ankr.com/eth"],
  [ARBITRUM]: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one-rpc.publicnode.com",
    // "https://1rpc.io/arb", has CORS issue
    "https://arbitrum-one.public.blastapi.io",
    // "https://arbitrum.drpc.org",
    "https://rpc.ankr.com/arbitrum",
  ],
  [AVALANCHE]: [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://avalanche-c-chain-rpc.publicnode.com",
    "https://1rpc.io/avax/c",
  ],
  [AVALANCHE_FUJI]: [
    "https://avalanche-fuji-c-chain.publicnode.com",
    "https://api.avax-test.network/ext/bc/C/rpc",
    // "https://ava-testnet.public.blastapi.io/v1/avax/fuji/public",
    // "https://rpc.ankr.com/avalanche_fuji",
  ],
  [ARBITRUM_SEPOLIA]: [
    "https://sepolia-rollup.arbitrum.io/rpc",
    "https://arbitrum-sepolia.drpc.org",
    "https://arbitrum-sepolia-rpc.publicnode.com",
  ],
  [SOURCE_BASE_MAINNET]: [
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
    "https://base-rpc.publicnode.com",
    "https://base.drpc.org",
  ],
  [SOURCE_OPTIMISM_SEPOLIA]: [
    "https://sepolia.optimism.io",
    "https://optimism-sepolia.drpc.org",
    "https://optimism-sepolia.therpc.io",
  ],
  [SOURCE_SEPOLIA]: ["https://sepolia.drpc.org"],
  [BOTANIX]: [
    // returns incorrect gas price
    // "https://rpc.botanixlabs.com",
    "https://rpc.ankr.com/botanix_mainnet",
  ],
};

export const FALLBACK_PROVIDERS: Record<AnyChainId, string[]> = {
  [ARBITRUM]: ENV_ARBITRUM_RPC_URLS ? JSON.parse(ENV_ARBITRUM_RPC_URLS) : [getAlchemyArbitrumHttpUrl("fallback")],
  [AVALANCHE]: ENV_AVALANCHE_RPC_URLS ? JSON.parse(ENV_AVALANCHE_RPC_URLS) : [getAlchemyAvalancheHttpUrl("fallback")],
  [AVALANCHE_FUJI]: [
    "https://endpoints.omniatech.io/v1/avax/fuji/public",
    "https://api.avax-test.network/ext/bc/C/rpc",
    "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
  ],
  [BOTANIX]: ENV_BOTANIX_RPC_URLS ? JSON.parse(ENV_BOTANIX_RPC_URLS) : [getAlchemyBotanixHttpUrl("fallback")],
  [ARBITRUM_SEPOLIA]: [getAlchemyArbitrumSepoliaHttpUrl("fallback")],
  [SOURCE_BASE_MAINNET]: [getAlchemyBaseMainnetHttpUrl("fallback")],
  [SOURCE_OPTIMISM_SEPOLIA]: [getAlchemyOptimismSepoliaHttpUrl("fallback")],
  [SOURCE_SEPOLIA]: [getAlchemyBaseSepoliaHttpUrl("fallback")],
};

export const PRIVATE_RPC_PROVIDERS: Partial<Record<AnyChainId, string[]>> = {
  [ARBITRUM]: [getAlchemyArbitrumHttpUrl("largeAccount")],
  [AVALANCHE]: [getAlchemyAvalancheHttpUrl("largeAccount")],
  [BOTANIX]: [getAlchemyBotanixHttpUrl("largeAccount")],
  [SOURCE_BASE_MAINNET]: [getAlchemyBaseMainnetHttpUrl("largeAccount")],
};

export const EXPRESS_RPC_PROVIDERS: Partial<Record<AnyChainId, string[]>> = {
  [ARBITRUM]: [getAlchemyArbitrumHttpUrl("express")],
  [AVALANCHE]: [getAlchemyAvalancheHttpUrl("express")],
  [BOTANIX]: [getAlchemyBotanixHttpUrl("express")],
  [SOURCE_BASE_MAINNET]: [getAlchemyBaseMainnetHttpUrl("express")],
};

type ConstantName = keyof (typeof constants)[ContractsChainId];

export const getConstant = <T extends ContractsChainId, K extends ConstantName>(
  chainId: T,
  key: K
): (typeof constants)[T][K] => {
  if (!constants[chainId]) {
    throw new Error(`Unsupported chainId ${chainId}`);
  }

  if (!(key in constants[chainId])) {
    throw new Error(`Key ${key} does not exist for chainId ${chainId}`);
  }

  return constants[chainId][key];
};

export function getFallbackRpcUrl(chainId: number, isLargeAccount: boolean): string {
  return sample(isLargeAccount ? PRIVATE_RPC_PROVIDERS[chainId] : FALLBACK_PROVIDERS[chainId]);
}

export function getExpressRpcUrl(chainId: number): string {
  return sample(EXPRESS_RPC_PROVIDERS[chainId]);
}

type AlchemyKeyPurpose = "fallback" | "largeAccount" | "express";

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

export function getAlchemyBaseSepoliaHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://base-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemySepoliaHttpUrl(purpose: AlchemyKeyPurpose) {
  return `https://eth-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getAlchemySepoliaWsUrl(purpose: AlchemyKeyPurpose) {
  return `wss://eth-sepolia.g.alchemy.com/v2/${getAlchemyKey(purpose)}`;
}

export function getExplorerUrl(chainId: number | "layerzero" | "layerzero-testnet"): string {
  switch (chainId as AnyChainId | "layerzero" | "layerzero-testnet") {
    case ARBITRUM:
      return "https://arbiscan.io/";
    case AVALANCHE:
      return "https://snowtrace.io/";
    case AVALANCHE_FUJI:
      return "https://testnet.snowtrace.io/";
    case ARBITRUM_SEPOLIA:
      return "https://sepolia.arbiscan.io/";
    case SOURCE_OPTIMISM_SEPOLIA:
      return "https://sepolia-optimism.etherscan.io/";
    case SOURCE_SEPOLIA:
      return "https://sepolia.etherscan.io/";
    case BOTANIX:
      return "https://botanixscan.io/";
    case SOURCE_BASE_MAINNET:
      return "https://basescan.org/";
    case "layerzero":
      return "https://layerzeroscan.com/";
    case "layerzero-testnet":
      return "https://testnet.layerzeroscan.com/";
  }
}

export function getTokenExplorerUrl(chainId: number, tokenAddress: string) {
  return `${getExplorerUrl(chainId)}token/${tokenAddress}`;
}
