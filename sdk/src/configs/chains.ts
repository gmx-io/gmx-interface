import { defineChain } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  avalanche,
  avalancheFuji,
  base,
  bsc,
  Chain,
  mainnet,
  optimismSepolia,
  sepolia,
} from "viem/chains";

import { ContractsChainConfig, SourceChainConfig } from "utils/chains/types";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  MEGAETH,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "./chainIds";

export {
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  MEGAETH,
  ARBITRUM_SEPOLIA,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
};

export const CONTRACTS_CHAIN_IDS = [ARBITRUM, AVALANCHE, BOTANIX, MEGAETH] as const;
export const CONTRACTS_CHAIN_IDS_DEV = [...CONTRACTS_CHAIN_IDS, AVALANCHE_FUJI, ARBITRUM_SEPOLIA] as const;
export const SETTLEMENT_CHAIN_IDS = [ARBITRUM, AVALANCHE] as const;
export const SETTLEMENT_CHAIN_IDS_DEV = [...SETTLEMENT_CHAIN_IDS, ARBITRUM_SEPOLIA, AVALANCHE_FUJI] as const;
export const SOURCE_CHAIN_IDS = [
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  ARBITRUM_SEPOLIA,
  ARBITRUM,
  AVALANCHE,
  AVALANCHE_FUJI,
] as const;

export type ContractsChainId = (typeof CONTRACTS_CHAIN_IDS_DEV)[number];
export type ContractsChainIdProduction = (typeof CONTRACTS_CHAIN_IDS)[number];
export type SettlementChainId = (typeof SETTLEMENT_CHAIN_IDS_DEV)[number];
export type SourceChainId = (typeof SOURCE_CHAIN_IDS)[number];
export const GMX_ACCOUNT_PSEUDO_CHAIN_ID = 0;
export type GmxAccountPseudoChainId = typeof GMX_ACCOUNT_PSEUDO_CHAIN_ID;

export type AnyChainId = ContractsChainId | SettlementChainId | SourceChainId;

const CONTRACTS_CHAIN_CONFIGS = {
  [ARBITRUM]: {
    chainId: ARBITRUM,
    name: "Arbitrum",
    slug: "arbitrum",
    explorerUrl: "https://arbiscan.io/",
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDC.e",
    highExecutionFee: 5,
    shouldUseMaxPriorityFeePerGas: false,
    defaultExecutionFeeBufferBps: 3000, // 30%
    maxFeePerGas: undefined,
    gasPricePremium: 0n,
    maxPriorityFeePerGas: 1500000000n, // 1.5 gwei
    excessiveExecutionFee: 10, // 10 USD
    minExecutionFee: undefined,
    gasPriceBuffer: 2000n, // 20%
    isDisabled: false,
  },
  [AVALANCHE]: {
    chainId: AVALANCHE,
    name: "Avalanche",
    slug: "avalanche",
    explorerUrl: "https://snowtrace.io/",
    nativeTokenSymbol: "AVAX",
    wrappedTokenSymbol: "WAVAX",
    defaultCollateralSymbol: "USDC",
    highExecutionFee: 5,
    shouldUseMaxPriorityFeePerGas: true,
    defaultExecutionFeeBufferBps: 1000, // 10%
    maxFeePerGas: 200000000000n, // 200 gwei
    gasPricePremium: 6000000000n, // 6 gwei
    maxPriorityFeePerGas: 1500000000n, // 1.5 gwei
    excessiveExecutionFee: 10, // 10 USD
    minExecutionFee: undefined,
    gasPriceBuffer: undefined,
    isDisabled: false,
  },
  [AVALANCHE_FUJI]: {
    chainId: AVALANCHE_FUJI,
    name: "Avalanche Fuji",
    slug: "fuji",
    explorerUrl: "https://testnet.snowtrace.io/",
    nativeTokenSymbol: "AVAX",
    wrappedTokenSymbol: "WAVAX",
    defaultCollateralSymbol: "USDC",
    highExecutionFee: 5,
    shouldUseMaxPriorityFeePerGas: true,
    defaultExecutionFeeBufferBps: 1000, // 10%
    maxFeePerGas: undefined,
    gasPricePremium: undefined,
    maxPriorityFeePerGas: 1500000000n,
    excessiveExecutionFee: 10, // 10 USD
    minExecutionFee: undefined,
    gasPriceBuffer: undefined,
    isDisabled: false,
  },
  [ARBITRUM_SEPOLIA]: {
    chainId: ARBITRUM_SEPOLIA,
    name: "Arbitrum Sepolia",
    slug: "arbitrum-sepolia",
    explorerUrl: "https://sepolia.arbiscan.io/",
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDC",
    highExecutionFee: 5,
    shouldUseMaxPriorityFeePerGas: false,
    defaultExecutionFeeBufferBps: 1000, // 10%
    maxFeePerGas: undefined,
    gasPricePremium: undefined,
    maxPriorityFeePerGas: 1500000000n,
    excessiveExecutionFee: 10, // 10 USD
    minExecutionFee: undefined,
    gasPriceBuffer: undefined,
    isDisabled: false,
  },
  [BOTANIX]: {
    chainId: BOTANIX,
    name: "Botanix",
    slug: "botanix",
    explorerUrl: "https://botanixscan.io/",
    nativeTokenSymbol: "BTC",
    wrappedTokenSymbol: "PBTC",
    defaultCollateralSymbol: "USDC.E",
    highExecutionFee: 5,
    shouldUseMaxPriorityFeePerGas: true,
    defaultExecutionFeeBufferBps: 3000, // 30%
    maxFeePerGas: 20n,
    gasPricePremium: undefined,
    maxPriorityFeePerGas: 7n,
    excessiveExecutionFee: 10, // 10 USD
    /**
     * avoid botanix gas spikes when chain is not actively used
     * if set, execution fee value should not be less than this in USD equivalent
     */
    minExecutionFee: 1000000000000000000000000000n, // 1e27 $0.001
    gasPriceBuffer: undefined,
    isDisabled: false,
  },
  [MEGAETH]: {
    chainId: MEGAETH,
    name: "MegaETH",
    slug: "megaeth",
    explorerUrl: "https://megaeth.blockscout.com/",
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDM",
    highExecutionFee: 5,
    shouldUseMaxPriorityFeePerGas: true,
    defaultExecutionFeeBufferBps: 3000, // 30%
    maxFeePerGas: undefined,
    gasPricePremium: 0n,
    maxPriorityFeePerGas: 500000n, // 0.0005 gwei
    excessiveExecutionFee: 10, // 10 USD
    minExecutionFee: undefined,
    gasPriceBuffer: 2000n, // 20%
    isDisabled: false,
  },
  // Use this notation to correctly infer chain names, etc. from config
} as const satisfies Record<ContractsChainId, ContractsChainConfig>;

const SOURCE_CHAIN_CONFIGS = {
  [SOURCE_OPTIMISM_SEPOLIA]: {
    chainId: SOURCE_OPTIMISM_SEPOLIA,
    name: "Optimism Sepolia",
    slug: "optimism-sepolia",
    explorerUrl: "https://sepolia-optimism.etherscan.io/",
  },
  [SOURCE_SEPOLIA]: {
    chainId: SOURCE_SEPOLIA,
    name: "Sepolia",
    slug: "sepolia",
    explorerUrl: "https://sepolia.etherscan.io/",
  },
  [SOURCE_BASE_MAINNET]: {
    chainId: SOURCE_BASE_MAINNET,
    name: "Base",
    slug: "base-mainnet",
    explorerUrl: "https://basescan.org/",
  },
  [SOURCE_BSC_MAINNET]: {
    chainId: SOURCE_BSC_MAINNET,
    name: "BNB",
    slug: "bnb-mainnet",
    explorerUrl: "https://bscscan.com/",
  },
  [SOURCE_ETHEREUM_MAINNET]: {
    chainId: SOURCE_ETHEREUM_MAINNET,
    name: "Ethereum",
    slug: "ethereum-mainnet",
    explorerUrl: "https://etherscan.io/",
  },
  [ARBITRUM]: {
    chainId: ARBITRUM,
    name: "Arbitrum",
    slug: "arbitrum",
    explorerUrl: "https://arbiscan.io/",
  },
  [AVALANCHE]: {
    chainId: AVALANCHE,
    name: "Avalanche",
    slug: "avalanche",
    explorerUrl: "https://snowtrace.io/",
  },
  [ARBITRUM_SEPOLIA]: {
    chainId: ARBITRUM_SEPOLIA,
    name: "Arbitrum Sepolia",
    slug: "arbitrum-sepolia",
    explorerUrl: "https://sepolia.arbiscan.io/",
  },
  [AVALANCHE_FUJI]: {
    chainId: AVALANCHE_FUJI,
    name: "Avalanche Fuji",
    slug: "avalanche-fuji",
    explorerUrl: "https://testnet.snowtrace.io/",
  },
  // Use this notation to correctly infer chain names, etc. from config
} as const satisfies Record<SourceChainId, SourceChainConfig>;

const ALL_CHAIN_CONFIGS = {
  ...CONTRACTS_CHAIN_CONFIGS,
  ...SOURCE_CHAIN_CONFIGS,
};

export type ContractsChainName = (typeof CONTRACTS_CHAIN_CONFIGS)[keyof typeof CONTRACTS_CHAIN_CONFIGS]["name"];
export type SourceChainName = (typeof SOURCE_CHAIN_CONFIGS)[keyof typeof SOURCE_CHAIN_CONFIGS]["name"];
export type ChainName = ContractsChainName | SourceChainName | "Unknown";

export type ContractsChainSlug = (typeof CONTRACTS_CHAIN_CONFIGS)[keyof typeof CONTRACTS_CHAIN_CONFIGS]["slug"];
export type SourceChainSlug = (typeof SOURCE_CHAIN_CONFIGS)[keyof typeof SOURCE_CHAIN_CONFIGS]["slug"];
export type ChainSlug = ContractsChainSlug | SourceChainSlug | "unknown";

export const botanix: Chain = defineChain({
  id: BOTANIX,
  name: "Botanix",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        // this rpc returns incorrect gas price
        // "https://rpc.botanixlabs.com",

        "https://rpc.ankr.com/botanix_mainnet",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BotanixScan",
      url: "https://botanixscan.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0x4BaA24f93a657f0c1b4A0Ffc72B91011E35cA46b",
    },
  },
});

export const megaeth: Chain = defineChain({
  id: MEGAETH,
  name: "MegaETH",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.megaeth.com/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "MegaExplorer",
      url: "https://megaeth.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xF516BC01c50eebdBad4d7E506c8f690ae8EAFc52",
    },
  },
});

export const VIEM_CHAIN_BY_CHAIN_ID: Record<AnyChainId, Chain> = {
  [AVALANCHE_FUJI]: avalancheFuji,
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  [ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [BOTANIX]: botanix,
  [MEGAETH]: megaeth,
  [SOURCE_ETHEREUM_MAINNET]: mainnet,
  [SOURCE_OPTIMISM_SEPOLIA]: optimismSepolia,
  [SOURCE_SEPOLIA]: sepolia,
  [SOURCE_BASE_MAINNET]: base,
  [SOURCE_BSC_MAINNET]: bsc,
};

export function getChainName(chainId: number): ChainName {
  return ALL_CHAIN_CONFIGS[chainId]?.name ?? "Unknown";
}

export function getChainSlug(chainId: number): ChainSlug {
  return ALL_CHAIN_CONFIGS[chainId]?.slug ?? "unknown";
}

export function getChainIdBySlug(slug: string): AnyChainId | undefined {
  const chainId = Object.values(ALL_CHAIN_CONFIGS).find((config) => config.slug === slug)?.chainId;

  return chainId;
}

export const getViemChain = (chainId: number): Chain => {
  return VIEM_CHAIN_BY_CHAIN_ID[chainId];
};

export function getHighExecutionFee(chainId: number) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.highExecutionFee ?? 5;
}

export function getExcessiveExecutionFee(chainId: number) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.excessiveExecutionFee ?? 10;
}

export function isContractsChain(chainId: number, dev = false): chainId is ContractsChainId {
  return (dev ? CONTRACTS_CHAIN_IDS_DEV : CONTRACTS_CHAIN_IDS).includes(chainId as any);
}

export function isTestnetChain(chainId: number): boolean {
  return [AVALANCHE_FUJI, ARBITRUM_SEPOLIA, SOURCE_SEPOLIA, SOURCE_OPTIMISM_SEPOLIA].includes(chainId);
}

export function getMaxFeePerGas(chainId: ContractsChainId): bigint | undefined {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.maxFeePerGas;
}

export function getGasPricePremium(chainId: ContractsChainId): bigint | undefined {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.gasPricePremium;
}

export function getMaxPriorityFeePerGas(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.maxPriorityFeePerGas;
}

export function getMinExecutionFeeUsd(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.minExecutionFee;
}

export function getGasPriceBuffer(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.gasPriceBuffer;
}

export function isChainDisabled(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.isDisabled ?? false;
}

export function getChainNativeTokenSymbol(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.nativeTokenSymbol;
}

export function getChainWrappedTokenSymbol(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.wrappedTokenSymbol;
}

export function getChainDefaultCollateralSymbol(chainId: ContractsChainId) {
  return CONTRACTS_CHAIN_CONFIGS[chainId]?.defaultCollateralSymbol;
}

export function getExplorerUrl(chainId: number | "layerzero" | "layerzero-testnet"): string {
  switch (chainId as AnyChainId | "layerzero" | "layerzero-testnet") {
    case "layerzero":
      return "https://layerzeroscan.com/";
    case "layerzero-testnet":
      return "https://testnet.layerzeroscan.com/";
    default:
      return ALL_CHAIN_CONFIGS[chainId]?.explorerUrl ?? "";
  }
}

export function getTokenExplorerUrl(chainId: number, tokenAddress: string) {
  return `${getExplorerUrl(chainId)}token/${tokenAddress}`;
}

export function getExecutionFeeConfig(
  chainId: ContractsChainId
): { shouldUseMaxPriorityFeePerGas: boolean; defaultBufferBps: number | undefined } | undefined {
  const config = CONTRACTS_CHAIN_CONFIGS[chainId];

  if (!config) {
    return undefined;
  }

  return {
    shouldUseMaxPriorityFeePerGas: config.shouldUseMaxPriorityFeePerGas,
    defaultBufferBps: config.defaultExecutionFeeBufferBps,
  };
}
