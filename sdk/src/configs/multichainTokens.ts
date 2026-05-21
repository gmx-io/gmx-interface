import { zeroAddress } from "viem";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "./chainIds";
import { SettlementChainId, SourceChainId } from "./chains";
import platformTokensData from "../codegen/platformTokens.json";

export type MultichainTokenId = {
  chainId: SettlementChainId | SourceChainId;
  address: string;
  decimals: number;
  /** Stargate pool address on this chain for the same logical token. */
  stargate: string;
  symbol: string;
  isTestnet?: boolean;
  isPlatformToken?: boolean;
};

export type MultichainTokenGroups = Partial<
  Record<string, Partial<Record<SettlementChainId | SourceChainId, MultichainTokenId>>>
>;

const STARGATE_POOLS = {
  USDC: {
    [ARBITRUM]: "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3",
    [AVALANCHE]: "0x5634c4a5FEd09819E3c46D86A965Dd9447d86e47",
    [SOURCE_BASE_MAINNET]: "0x27a16dc786820B16E5c9028b75B99F6f604b5d26",
    [SOURCE_BSC_MAINNET]: "0x962Bd449E630b0d928f308Ce63f1A21F02576057",
    [SOURCE_ETHEREUM_MAINNET]: "0xc026395860Db2d07ee33e05fE50ed7bD583189C7",
    [ARBITRUM_SEPOLIA]: "0x543BdA7c6cA4384FE90B1F5929bb851F52888983",
    [SOURCE_SEPOLIA]: "0x4985b8fcEA3659FD801a5b857dA1D00e985863F0",
    [SOURCE_OPTIMISM_SEPOLIA]: "0x314B753272a3C79646b92A87dbFDEE643237033a",
  },
  USDT: {
    [ARBITRUM]: "0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0",
    [AVALANCHE]: "0x12dC9256Acc9895B076f6638D628382881e62CeE",
    [SOURCE_BSC_MAINNET]: "0x138EB30f73BC423c6455C53df6D89CB01d9eBc63",
    [SOURCE_ETHEREUM_MAINNET]: "0x933597a323Eb81cAe705C5bC29985172fd5A3973",
    [ARBITRUM_SEPOLIA]: "0xB956d6FDFB235636DE7885C5166756823bb27e3a",
    [SOURCE_SEPOLIA]: "0x9D819CcAE96d41d8F775bD1259311041248fF980",
  },
  ETH: {
    [ARBITRUM]: "0xA45B5130f36CDcA45667738e2a258AB09f4A5f7F",
    [SOURCE_BASE_MAINNET]: "0xdc181Bd607330aeeBEF6ea62e03e5e1Fb4B6F7C7",
    [SOURCE_ETHEREUM_MAINNET]: "0x77b2043768d28E9C9aB44E1aBfC95944bcE57931",
    [ARBITRUM_SEPOLIA]: "0x6fddB6270F6c71f31B62AE0260cfa8E2e2d186E0",
    [SOURCE_OPTIMISM_SEPOLIA]: "0xa31dCc5C71E25146b598bADA33E303627D7fC97e",
    [SOURCE_SEPOLIA]: "0x9Cc7e185162Aa5D1425ee924D97a87A0a34A0706",
  },
} as const;

const MAINNET_TOKEN_GROUPS: MultichainTokenGroups = {
  USDC: {
    [ARBITRUM]: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
      chainId: ARBITRUM,
      stargate: STARGATE_POOLS.USDC[ARBITRUM],
      symbol: "USDC",
    },
    [AVALANCHE]: {
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      chainId: AVALANCHE,
      stargate: STARGATE_POOLS.USDC[AVALANCHE],
      symbol: "USDC",
    },
    [SOURCE_BASE_MAINNET]: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      chainId: SOURCE_BASE_MAINNET,
      stargate: STARGATE_POOLS.USDC[SOURCE_BASE_MAINNET],
      symbol: "USDC",
    },
    [SOURCE_BSC_MAINNET]: {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
      chainId: SOURCE_BSC_MAINNET,
      stargate: STARGATE_POOLS.USDC[SOURCE_BSC_MAINNET],
      symbol: "USDC",
    },
    [SOURCE_ETHEREUM_MAINNET]: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      chainId: SOURCE_ETHEREUM_MAINNET,
      stargate: STARGATE_POOLS.USDC[SOURCE_ETHEREUM_MAINNET],
      symbol: "USDC",
    },
  },
  USDT: {
    [ARBITRUM]: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
      chainId: ARBITRUM,
      stargate: STARGATE_POOLS.USDT[ARBITRUM],
      symbol: "USDT",
    },
    [AVALANCHE]: {
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      decimals: 6,
      chainId: AVALANCHE,
      stargate: STARGATE_POOLS.USDT[AVALANCHE],
      symbol: "USDT",
    },
    [SOURCE_BSC_MAINNET]: {
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      chainId: SOURCE_BSC_MAINNET,
      stargate: STARGATE_POOLS.USDT[SOURCE_BSC_MAINNET],
      symbol: "USDT",
    },
    [SOURCE_ETHEREUM_MAINNET]: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
      chainId: SOURCE_ETHEREUM_MAINNET,
      stargate: STARGATE_POOLS.USDT[SOURCE_ETHEREUM_MAINNET],
      symbol: "USDT",
    },
  },
  ETH: {
    [ARBITRUM]: {
      address: zeroAddress,
      decimals: 18,
      chainId: ARBITRUM,
      stargate: STARGATE_POOLS.ETH[ARBITRUM],
      symbol: "ETH",
    },
    [SOURCE_BASE_MAINNET]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_BASE_MAINNET,
      stargate: STARGATE_POOLS.ETH[SOURCE_BASE_MAINNET],
      symbol: "ETH",
    },
    [SOURCE_ETHEREUM_MAINNET]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_ETHEREUM_MAINNET,
      stargate: STARGATE_POOLS.ETH[SOURCE_ETHEREUM_MAINNET],
      symbol: "ETH",
    },
  },
};

const TESTNET_TOKEN_GROUPS: MultichainTokenGroups = {
  "USDC.SG": {
    [ARBITRUM_SEPOLIA]: {
      address: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
      decimals: 6,
      chainId: ARBITRUM_SEPOLIA,
      stargate: STARGATE_POOLS.USDC[ARBITRUM_SEPOLIA],
      symbol: "USDC.SG",
      isTestnet: true,
    },
    [SOURCE_OPTIMISM_SEPOLIA]: {
      address: "0x488327236B65C61A6c083e8d811a4E0D3d1D4268",
      decimals: 6,
      chainId: SOURCE_OPTIMISM_SEPOLIA,
      stargate: STARGATE_POOLS.USDC[SOURCE_OPTIMISM_SEPOLIA],
      symbol: "USDC.SG",
      isTestnet: true,
    },
    [SOURCE_SEPOLIA]: {
      address: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
      decimals: 6,
      chainId: SOURCE_SEPOLIA,
      stargate: STARGATE_POOLS.USDC[SOURCE_SEPOLIA],
      symbol: "USDC.SG",
      isTestnet: true,
    },
  },
  ETH: {
    [ARBITRUM_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: ARBITRUM_SEPOLIA,
      stargate: STARGATE_POOLS.ETH[ARBITRUM_SEPOLIA],
      symbol: "ETH",
      isTestnet: true,
    },
    [SOURCE_OPTIMISM_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_OPTIMISM_SEPOLIA,
      stargate: STARGATE_POOLS.ETH[SOURCE_OPTIMISM_SEPOLIA],
      symbol: "ETH",
      isTestnet: true,
    },
    [SOURCE_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_SEPOLIA,
      stargate: STARGATE_POOLS.ETH[SOURCE_SEPOLIA],
      symbol: "ETH",
      isTestnet: true,
    },
  },
  USDT: {
    [ARBITRUM_SEPOLIA]: {
      address: "0x095f40616FA98Ff75D1a7D0c68685c5ef806f110",
      decimals: 6,
      chainId: ARBITRUM_SEPOLIA,
      stargate: STARGATE_POOLS.USDT[ARBITRUM_SEPOLIA],
      symbol: "USDT",
      isTestnet: true,
    },
    [SOURCE_SEPOLIA]: {
      address: "0xF3F2b4815A58152c9BE53250275e8211163268BA",
      decimals: 6,
      chainId: SOURCE_SEPOLIA,
      stargate: STARGATE_POOLS.USDT[SOURCE_SEPOLIA],
      symbol: "USDT",
      isTestnet: true,
    },
  },
};

type PlatformTokenSet = Record<
  string,
  Partial<Record<string, { address: string; stargate: string }>>
>;

function applyPlatformTokens(
  groups: MultichainTokenGroups,
  set: PlatformTokenSet,
  { isTestnet }: { isTestnet: boolean }
): void {
  for (const [symbol, chainAddresses] of Object.entries(set)) {
    groups[symbol] = groups[symbol] ?? {};
    for (const chainIdStr of Object.keys(chainAddresses)) {
      const chainIdKey = Number(chainIdStr) as SettlementChainId | SourceChainId;
      const entry = chainAddresses[chainIdStr]!;
      groups[symbol]![chainIdKey] = {
        address: entry.address,
        decimals: 18,
        chainId: chainIdKey,
        stargate: entry.stargate,
        symbol,
        isPlatformToken: true,
        ...(isTestnet ? { isTestnet: true } : {}),
      };
    }
  }
}

function mergeGroups(...sources: MultichainTokenGroups[]): MultichainTokenGroups {
  const merged: MultichainTokenGroups = {};
  for (const src of sources) {
    for (const [symbol, byChain] of Object.entries(src)) {
      merged[symbol] = { ...merged[symbol], ...byChain };
    }
  }
  return merged;
}

let cachedMainnet: MultichainTokenGroups | undefined;
let cachedAll: MultichainTokenGroups | undefined;

/**
 * Returns the full multichain token registry. By default returns mainnet-only;
 * pass `includeTestnets: true` to also expose Sepolia/Fuji/USDC.SG entries.
 */
export function getMultichainTokenGroups(
  { includeTestnets }: { includeTestnets?: boolean } = {}
): MultichainTokenGroups {
  if (includeTestnets) {
    if (!cachedAll) {
      const groups = mergeGroups(MAINNET_TOKEN_GROUPS, TESTNET_TOKEN_GROUPS);
      applyPlatformTokens(groups, platformTokensData.mainnets as PlatformTokenSet, { isTestnet: false });
      applyPlatformTokens(groups, platformTokensData.testnets as PlatformTokenSet, { isTestnet: true });
      cachedAll = groups;
    }
    return cachedAll;
  }
  if (!cachedMainnet) {
    const groups = mergeGroups(MAINNET_TOKEN_GROUPS);
    applyPlatformTokens(groups, platformTokensData.mainnets as PlatformTokenSet, { isTestnet: false });
    cachedMainnet = groups;
  }
  return cachedMainnet;
}

export function getMultichainTokenId(
  groups: MultichainTokenGroups,
  chainId: number,
  tokenAddress: string
): MultichainTokenId | undefined {
  const target = tokenAddress.toLowerCase();
  for (const byChain of Object.values(groups)) {
    const entry = byChain?.[chainId as SettlementChainId | SourceChainId];
    if (entry && entry.address.toLowerCase() === target) {
      return entry;
    }
  }
  return undefined;
}

export function getStargatePoolAddress(
  groups: MultichainTokenGroups,
  chainId: number,
  tokenAddress: string
): string | undefined {
  return getMultichainTokenId(groups, chainId, tokenAddress)?.stargate;
}

export function getMappedTokenId(
  groups: MultichainTokenGroups,
  fromChainId: number,
  fromChainTokenAddress: string,
  toChainId: number
): MultichainTokenId | undefined {
  const tokenId = getMultichainTokenId(groups, fromChainId, fromChainTokenAddress);
  if (!tokenId) return undefined;
  return groups[tokenId.symbol]?.[toChainId as SettlementChainId | SourceChainId];
}

export type StargatePoolLookup = {
  chainId: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  poolAddress?: string;
};

/** Versatile resolver: by symbol, settlement-chain tokenAddress, or pool address. */
export function resolveStargatePool(
  groups: MultichainTokenGroups,
  input: StargatePoolLookup
): MultichainTokenId | undefined {
  const chainKey = input.chainId as SettlementChainId | SourceChainId;
  if (input.tokenSymbol) {
    const entry = groups[input.tokenSymbol]?.[chainKey];
    if (entry) return entry;
  }
  if (input.tokenAddress) {
    const entry = getMultichainTokenId(groups, input.chainId, input.tokenAddress);
    if (entry) return entry;
  }
  if (input.poolAddress) {
    const target = input.poolAddress.toLowerCase();
    for (const byChain of Object.values(groups)) {
      const entry = byChain?.[chainKey];
      if (entry && entry.stargate.toLowerCase() === target) return entry;
    }
  }
  return undefined;
}

