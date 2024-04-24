import { ethers } from "ethers";
import { sample } from "lodash";
import { DynamicWalletNetworkMetadata, NetworkMetadata } from "lib/wallets";
import { isDevelopment } from "./env";

import arbitrum from "img/ic_arbitrum_24.svg";
import avalanche from "img/ic_avalanche_24.svg";
import avalancheTestnet from "img/ic_avalanche_testnet_24.svg";
import sepoliaTesnet from "img/ic_sepolia_testnet_24.svg";

import optimismIcn from "img/icn_opt_24.svg";
import blastIcn from "img/icn_blast.svg";

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
    BLAST_SEPOLIA_TESTNET
  );
}

export const IS_NETWORK_DISABLED = {
  [ARBITRUM]: false,
  [SEPOLIA_TESTNET]: false,
  [OPTIMISM_GOERLI_TESTNET]: false,
  [AVALANCHE]: false,
  [OPTIMISM_MAINNET]: false,
  [BLAST_SEPOLIA_TESTNET]: false,
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
};

export const FALLBACK_PROVIDERS = {
  [ARBITRUM]: [getAlchemyHttpUrl()],
  [AVALANCHE]: ["https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b"],
};

export const DYNAMIC_NETWORK_METADATA: DynamicWalletNetworkMetadata[] = [
  {
    blockExplorerUrls: ["https://bscscan.com"],
    chainId: MAINNET,
    iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
    name: "MAINNET",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    networkId: MAINNET,
    rpcUrls: RPC_PROVIDERS[MAINNET],
    vanityName: "Mainnet",
    privateCustomerRpcUrls: RPC_PROVIDERS[MAINNET],
  },
  {
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
    chainId: TESTNET,
    iconUrls: [""],
    name: "BSC Testnet",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    networkId: TESTNET,
    rpcUrls: RPC_PROVIDERS[TESTNET],
    vanityName: "BSC Testnet",
    privateCustomerRpcUrls: RPC_PROVIDERS[TESTNET],
  },
  {
    blockExplorerUrls: ["https://rinkeby-explorer.arbitrum.io/"],
    chainId: ARBITRUM_TESTNET,
    iconUrls: [arbitrum],
    name: "Arbitrum Testnet",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    networkId: ARBITRUM_TESTNET,
    rpcUrls: RPC_PROVIDERS[ARBITRUM_TESTNET],
    vanityName: "Arbitrum Testnet",
    privateCustomerRpcUrls: RPC_PROVIDERS[ARBITRUM_TESTNET],
  },
  {
    blockExplorerUrls: [getExplorerUrl(ARBITRUM)],
    chainId: ARBITRUM,
    iconUrls: [arbitrum],
    name: "Arbitrum",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    networkId: ARBITRUM,
    rpcUrls: RPC_PROVIDERS[ARBITRUM],
    vanityName: "Arbitrum",
    privateCustomerRpcUrls: RPC_PROVIDERS[ARBITRUM],
  },
  {
    blockExplorerUrls: [getExplorerUrl(AVALANCHE)],
    chainId: AVALANCHE,
    iconUrls: [avalanche],
    name: "Avalanche",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    networkId: AVALANCHE,
    rpcUrls: RPC_PROVIDERS[AVALANCHE],
    vanityName: "Avalanche",
    privateCustomerRpcUrls: RPC_PROVIDERS[AVALANCHE],
  },
  {
    blockExplorerUrls: [getExplorerUrl(AVALANCHE_FUJI)],
    chainId: AVALANCHE_FUJI,
    iconUrls: [avalancheTestnet],
    name: "Avalanche Fuji",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    networkId: AVALANCHE_FUJI,
    rpcUrls: RPC_PROVIDERS[AVALANCHE_FUJI],
    vanityName: "Avalanche Fuji",
    privateCustomerRpcUrls: RPC_PROVIDERS[AVALANCHE_FUJI],
  },
  {
    blockExplorerUrls: [getExplorerUrl(SEPOLIA_TESTNET)],
    chainId: SEPOLIA_TESTNET,
    iconUrls: [sepoliaTesnet],
    name: "Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    networkId: SEPOLIA_TESTNET,
    rpcUrls: RPC_PROVIDERS[SEPOLIA_TESTNET],
    vanityName: "Sepolia",
    privateCustomerRpcUrls: RPC_PROVIDERS[SEPOLIA_TESTNET],
  },
  {
    blockExplorerUrls: [getExplorerUrl(OPTIMISM_GOERLI_TESTNET)],
    chainId: OPTIMISM_GOERLI_TESTNET,
    iconUrls: [optimismIcn],
    name: "Optimism Goreli Testnet",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    networkId: OPTIMISM_GOERLI_TESTNET,
    rpcUrls: RPC_PROVIDERS[OPTIMISM_GOERLI_TESTNET],
    vanityName: "Optimism Goreli Testnet",
    privateCustomerRpcUrls: RPC_PROVIDERS[OPTIMISM_GOERLI_TESTNET],
  },
  {
    blockExplorerUrls: [getExplorerUrl(OPTIMISM_MAINNET)],
    chainId: OPTIMISM_MAINNET,
    iconUrls: [optimismIcn],
    name: "Optimism",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    networkId: OPTIMISM_MAINNET,
    rpcUrls: RPC_PROVIDERS[OPTIMISM_MAINNET],
    vanityName: "Optimism",
    privateCustomerRpcUrls: RPC_PROVIDERS[OPTIMISM_MAINNET],
  },
  {
    blockExplorerUrls: [getExplorerUrl(BLAST_SEPOLIA_TESTNET)],
    chainId: BLAST_SEPOLIA_TESTNET,
    iconUrls: [blastIcn],
    name: "Blast Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    networkId: BLAST_SEPOLIA_TESTNET,
    rpcUrls: RPC_PROVIDERS[BLAST_SEPOLIA_TESTNET],
    vanityName: "Blast Sepolia",
    privateCustomerRpcUrls: RPC_PROVIDERS[BLAST_SEPOLIA_TESTNET],
  },
];

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
};

export function getDynamicChain(chainNames: number[]) {
  const networksForDynamicWallet: DynamicWalletNetworkMetadata[] = [];

  chainNames.forEach((chain) => {
    const filteredNetwork = DYNAMIC_NETWORK_METADATA.filter((network) => network.chainId === chain);
    if (filteredNetwork.length > 0) networksForDynamicWallet.push(filteredNetwork[0]);
  });
  return networksForDynamicWallet;
}

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
