import { ethers } from "ethers";
import { sample } from "lodash";
import { NetworkMetadata } from "lib/wallets";
import { isDevelopment } from "./env";

const { parseEther } = ethers.utils;

export const MAINNET = 56;
export const TESTNET = 97;
export const ETH_MAINNET = 1;
export const AVALANCHE = 43114;
export const AVALANCHE_FUJI = 43113;
export const ARBITRUM = 42161;
export const ARBITRUM_TESTNET = 421611;
export const SEPOLIA_TESTNET = 11155111;
export const OPTIMISM_GOERLI_TESTNET = 420;
export const OPTIMISM_MAINNET = 10;
export const BLAST_SEPOLIA_TESTNET = 168587773;
export const MORPH_L2 = 2710;

// TODO take it from web3
export const DEFAULT_CHAIN_ID = OPTIMISM_MAINNET;
export const CHAIN_ID = DEFAULT_CHAIN_ID;

export const SUPPORTED_CHAIN_IDS = [ARBITRUM, AVALANCHE, OPTIMISM_MAINNET];

if (isDevelopment()) {
  SUPPORTED_CHAIN_IDS.push(
    ARBITRUM_TESTNET,
    AVALANCHE_FUJI,
    SEPOLIA_TESTNET,
    OPTIMISM_GOERLI_TESTNET,
    BLAST_SEPOLIA_TESTNET,
    MORPH_L2
  );
}

export const IS_NETWORK_DISABLED = {
  [ARBITRUM]: false,
  [SEPOLIA_TESTNET]: false,
  [OPTIMISM_GOERLI_TESTNET]: false,
  [AVALANCHE]: false,
  [OPTIMISM_MAINNET]: false,
  [BLAST_SEPOLIA_TESTNET]: false,
  [MORPH_L2]: false,
};

export const CHAIN_NAMES_MAP = {
  [MAINNET]: "BSC",
  [TESTNET]: "BSC Testnet",
  [ARBITRUM_TESTNET]: "ArbRinkeby",
  [ARBITRUM]: "Arbitrum",
  [AVALANCHE]: "Avalanche",
  [AVALANCHE_FUJI]: "Avalanche Fuji",
  [SEPOLIA_TESTNET]: "Sepolia",
  [OPTIMISM_GOERLI_TESTNET]: "Optimism Goerli",
  [OPTIMISM_MAINNET]: "Optimism Mainnet",
  [BLAST_SEPOLIA_TESTNET]: "Blast Testnet",
  [MORPH_L2]: "Morph L2",
};

export const GAS_PRICE_ADJUSTMENT_MAP = {
  [ARBITRUM]: "0",
  [AVALANCHE]: "3000000000", // 3 gwei
};

export const MAX_GAS_PRICE_MAP = {
  [AVALANCHE]: "200000000000", // 200 gwei
};

export const HIGH_EXECUTION_FEES_MAP = {
  [ARBITRUM]: 3, // 3 USD
  [AVALANCHE]: 3, // 3 USD
};

const constants = {
  [MAINNET]: {
    nativeTokenSymbol: "BNB",
    defaultCollateralSymbol: "BUSD",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 8,
    v2: false,
  },

  [TESTNET]: {
    nativeTokenSymbol: "BNB",
    defaultCollateralSymbol: "BUSD",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 8,
    v2: false,
  },

  [ARBITRUM_TESTNET]: {
    nativeTokenSymbol: "ETH",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.000300001"),
  },

  [ARBITRUM]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDC",
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

  [SEPOLIA_TESTNET]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDT",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.000300001"),
  },

  [OPTIMISM_GOERLI_TESTNET]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDT",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.01"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0100001"),
  },

  [OPTIMISM_MAINNET]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDT",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.000300001"),
  },

  [BLAST_SEPOLIA_TESTNET]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDT",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.000300001"),
  },
  [MORPH_L2]: {
    nativeTokenSymbol: "ETH",
    wrappedTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDT",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0003"),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.000300001"),
  },
};

const ALCHEMY_WHITELISTED_DOMAINS = ["t3.money", "app.t3.money"];

export const RPC_PROVIDERS = {
  [ETH_MAINNET]: ["https://rpc.ankr.com/eth"],
  [MAINNET]: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc-dataseed1.ninicoin.io",
    "https://bsc-dataseed2.defibit.io",
    "https://bsc-dataseed3.defibit.io",
    "https://bsc-dataseed4.defibit.io",
    "https://bsc-dataseed2.ninicoin.io",
    "https://bsc-dataseed3.ninicoin.io",
    "https://bsc-dataseed4.ninicoin.io",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed2.binance.org",
    "https://bsc-dataseed3.binance.org",
    "https://bsc-dataseed4.binance.org",
  ],
  [TESTNET]: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
  [ARBITRUM]: [getDefaultArbitrumRpcUrl()],
  [ARBITRUM_TESTNET]: ["https://rinkeby.arbitrum.io/rpc"],
  [AVALANCHE]: ["https://api.avax.network/ext/bc/C/rpc"],
  [AVALANCHE_FUJI]: ["https://api.avax-test.network/ext/bc/C/rpc"],
  [SEPOLIA_TESTNET]: ["https://sepolia.infura.io/v3/88088bd69e9f45cd9e1842a20addb42d"],
  [OPTIMISM_GOERLI_TESTNET]: ["https://opt-goerli.g.alchemy.com/v2/4AflwA8Mr5qf9nxuS90eSGlsLHPHMCHK"],
  [OPTIMISM_MAINNET]: ["https://mainnet.optimism.io"],
  [BLAST_SEPOLIA_TESTNET]: ["https://sepolia.blast.io"],
  [MORPH_L2]: ["https://rpc-testnet.morphl2.io"],
};

export const FALLBACK_PROVIDERS = {
  [ARBITRUM]: [getAlchemyHttpUrl()],
  [AVALANCHE]: ["https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b"],
};

export const NETWORK_METADATA: { [chainId: number]: NetworkMetadata } = {
  [MAINNET]: {
    chainId: "0x" + MAINNET.toString(16),
    chainName: "BSC",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[MAINNET],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  [TESTNET]: {
    chainId: "0x" + TESTNET.toString(16),
    chainName: "BSC Testnet",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[TESTNET],
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
  },
  [ARBITRUM_TESTNET]: {
    chainId: "0x" + ARBITRUM_TESTNET.toString(16),
    chainName: "Arbitrum Testnet",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[ARBITRUM_TESTNET],
    blockExplorerUrls: ["https://rinkeby-explorer.arbitrum.io/"],
  },
  [ARBITRUM]: {
    chainId: "0x" + ARBITRUM.toString(16),
    chainName: "Arbitrum",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[ARBITRUM],
    blockExplorerUrls: [getExplorerUrl(ARBITRUM)],
  },
  [AVALANCHE]: {
    chainId: "0x" + AVALANCHE.toString(16),
    chainName: "Avalanche",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[AVALANCHE],
    blockExplorerUrls: [getExplorerUrl(AVALANCHE)],
  },
  [AVALANCHE_FUJI]: {
    chainId: "0x" + AVALANCHE_FUJI.toString(16),
    chainName: "Avalanche Fuji",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[AVALANCHE_FUJI],
    blockExplorerUrls: [getExplorerUrl(AVALANCHE_FUJI)],
  },
  [SEPOLIA_TESTNET]: {
    chainId: "0x" + SEPOLIA_TESTNET.toString(16),
    chainName: "Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[SEPOLIA_TESTNET],
    blockExplorerUrls: [getExplorerUrl(SEPOLIA_TESTNET)],
  },
  [OPTIMISM_GOERLI_TESTNET]: {
    chainId: "0x" + SEPOLIA_TESTNET.toString(16),
    chainName: "Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[OPTIMISM_GOERLI_TESTNET],
    blockExplorerUrls: [getExplorerUrl(OPTIMISM_GOERLI_TESTNET)],
  },
  [OPTIMISM_MAINNET]: {
    chainId: "0x" + OPTIMISM_MAINNET.toString(16),
    chainName: "Optimism",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[OPTIMISM_MAINNET],
    blockExplorerUrls: [getExplorerUrl(OPTIMISM_MAINNET)],
  },
  [BLAST_SEPOLIA_TESTNET]: {
    chainId: "0x" + BLAST_SEPOLIA_TESTNET.toString(16),
    chainName: "Blast Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[BLAST_SEPOLIA_TESTNET],
    blockExplorerUrls: [getExplorerUrl(BLAST_SEPOLIA_TESTNET)],
  },
  [MORPH_L2]: {
    chainId: "0x" + MORPH_L2.toString(16),
    chainName: "Morph L2",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[MORPH_L2],
    blockExplorerUrls: [getExplorerUrl(MORPH_L2)],
  },
};

export const getConstant = (chainId: number, key: string) => {
  if (!constants[chainId]) {
    throw new Error(`Unsupported chainId ${chainId}`);
  }

  if (!(key in constants[chainId])) {
    throw new Error(`Key ${key} does not exist for chainId ${chainId}`);
  }

  return constants[chainId][key];
};

export function getChainName(chainId: number) {
  return CHAIN_NAMES_MAP[chainId];
}

export function getDefaultArbitrumRpcUrl() {
  return "https://arb1.arbitrum.io/rpc";
}

export function getRpcUrl(chainId: number): string | undefined {
  return sample(RPC_PROVIDERS[chainId]);
}

export function getFallbackRpcUrl(chainId: number): string | undefined {
  return sample(FALLBACK_PROVIDERS[chainId]);
}

export function getAlchemyHttpUrl() {
  if (ALCHEMY_WHITELISTED_DOMAINS.includes(window.location.host)) {
    return "https://arb-mainnet.g.alchemy.com/v2/ha7CFsr1bx5ZItuR6VZBbhKozcKDY4LZ";
  }
  return "https://arb-mainnet.g.alchemy.com/v2/EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
}

export function getAlchemyWsUrl() {
  if (ALCHEMY_WHITELISTED_DOMAINS.includes(window.location.host)) {
    return "wss://arb-mainnet.g.alchemy.com/v2/ha7CFsr1bx5ZItuR6VZBbhKozcKDY4LZ";
  }
  return "wss://arb-mainnet.g.alchemy.com/v2/EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
}

export function getExplorerUrl(chainId) {
  switch (chainId) {
    case 3:
      return "https://ropsten.etherscan.io/";
    case 42:
      return "https://kovan.etherscan.io/";
    case MAINNET:
      return "https://bscscan.com/";
    case TESTNET:
      return "https://testnet.bscscan.com/";
    case ARBITRUM_TESTNET:
      return "https://testnet.arbiscan.io/";
    case ARBITRUM:
      return "https://arbiscan.io/";
    case AVALANCHE:
      return "https://snowtrace.io/";
    case AVALANCHE_FUJI:
      return "https://testnet.snowtrace.io/";
    case SEPOLIA_TESTNET:
      return "https://sepolia.etherscan.io/";
    case OPTIMISM_GOERLI_TESTNET:
      return "https://goerli-optimism.etherscan.io/";
    case OPTIMISM_MAINNET:
      return "https://optimistic.etherscan.io/";
    case BLAST_SEPOLIA_TESTNET:
      return "https://testnet.blastscan.io/";
    case MORPH_L2:
      return "https://explorer-testnet.morphl2.io";
    default:
      return "https://etherscan.io/";
  }
}

export function getHighExecutionFee(chainId) {
  return HIGH_EXECUTION_FEES_MAP[chainId] || 3;
}

export function isSupportedChain(chainId) {
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}
