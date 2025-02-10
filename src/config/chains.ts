import { ethers } from "ethers";
import type { NetworkMetadata } from "lib/wallets";
import sample from "lodash/sample";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BSС_MAINNET, BSС_TESTNET, ETH_MAINNET } from "./static/chains";
import {
  SUPPORTED_CHAIN_IDS as SDK_SUPPORTED_CHAIN_IDS,
  SUPPORTED_CHAIN_IDS_DEV as SDK_SUPPORTED_CHAIN_IDS_DEV,
} from "../../sdk/src/configs/chains";
import { isDevelopment } from "./env";

export * from "./static/chains";

export const SUPPORTED_CHAIN_IDS = isDevelopment() ? SDK_SUPPORTED_CHAIN_IDS_DEV : SDK_SUPPORTED_CHAIN_IDS;

const { parseEther } = ethers;

export const ENV_ARBITRUM_RPC_URLS = import.meta.env.VITE_APP_ARBITRUM_RPC_URLS;
export const ENV_AVALANCHE_RPC_URLS = import.meta.env.VITE_APP_AVALANCHE_RPC_URLS;

// TODO take it from web3
export const DEFAULT_CHAIN_ID = ARBITRUM;
export const CHAIN_ID = DEFAULT_CHAIN_ID;

export const IS_NETWORK_DISABLED = {
  [ARBITRUM]: false,
  [AVALANCHE]: false,
  [BSС_MAINNET]: false,
};

export const CHAIN_NAMES_MAP = {
  [BSС_MAINNET]: "BSC",
  [BSС_TESTNET]: "BSC Testnet",
  [ARBITRUM]: "Arbitrum",
  [AVALANCHE]: "Avalanche",
  [AVALANCHE_FUJI]: "Avalanche Fuji",
};

export const NETWORK_EXECUTION_TO_CREATE_FEE_FACTOR = {
  [ARBITRUM]: 10n ** 29n * 5n,
  [AVALANCHE]: 10n ** 29n * 35n,
  [AVALANCHE_FUJI]: 10n ** 29n * 2n,
} as const;

const constants = {
  [BSС_MAINNET]: {
    nativeTokenSymbol: "BNB",
    defaultCollateralSymbol: "BUSD",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 8,
    v2: false,
  },

  [BSС_TESTNET]: {
    nativeTokenSymbol: "BNB",
    defaultCollateralSymbol: "BUSD",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 8,
    v2: false,
  },

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
};

const ALCHEMY_WHITELISTED_DOMAINS = ["gmx.io", "app.gmx.io"];

export const RPC_PROVIDERS = {
  [ETH_MAINNET]: ["https://rpc.ankr.com/eth"],
  [BSС_MAINNET]: [
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
  [BSС_TESTNET]: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
  [ARBITRUM]: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one-rpc.publicnode.com",
    "https://1rpc.io/arb",
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
};

export const FALLBACK_PROVIDERS = {
  [ARBITRUM]: ENV_ARBITRUM_RPC_URLS
    ? JSON.parse(ENV_ARBITRUM_RPC_URLS)
    : [
        /* getAlchemyArbitrumHttpUrl() */
        "https://arb1.arbitrum.io/rpc",
        "https://arbitrum-one-rpc.publicnode.com",
      ],
  [AVALANCHE]: ENV_AVALANCHE_RPC_URLS ? JSON.parse(ENV_AVALANCHE_RPC_URLS) : [getAlchemyAvalancheHttpUrl()],
  [AVALANCHE_FUJI]: [
    "https://endpoints.omniatech.io/v1/avax/fuji/public",
    "https://api.avax-test.network/ext/bc/C/rpc",
    "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
  ],
};

export const NETWORK_METADATA: { [chainId: number]: NetworkMetadata } = {
  [BSС_MAINNET]: {
    chainId: "0x" + BSС_MAINNET.toString(16),
    chainName: "BSC",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[BSС_MAINNET],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  [BSС_TESTNET]: {
    chainId: "0x" + BSС_TESTNET.toString(16),
    chainName: "BSC Testnet",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[BSС_TESTNET],
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
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
    chainName: "Avalanche Fuji Testnet",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[AVALANCHE_FUJI],
    blockExplorerUrls: [getExplorerUrl(AVALANCHE_FUJI)],
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

export function getFallbackRpcUrl(chainId: number): string {
  return sample(FALLBACK_PROVIDERS[chainId]);
}

function getAlchemyKey() {
  if (ALCHEMY_WHITELISTED_DOMAINS.includes(self.location.host)) {
    return "RcaXYTizJs51m-w9SnRyDrxSZhE5H9Mf";
  }
  return "EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2";
}

export function getAlchemyArbitrumHttpUrl() {
  return `https://arb-mainnet.g.alchemy.com/v2/${getAlchemyKey()}`;
}

export function getAlchemyAvalancheHttpUrl() {
  return `https://avax-mainnet.g.alchemy.com/v2/${getAlchemyKey()}`;
}

export function getAlchemyArbitrumWsUrl() {
  return `wss://arb-mainnet.g.alchemy.com/v2/${getAlchemyKey()}`;
}

export function getExplorerUrl(chainId) {
  if (chainId === 3) {
    return "https://ropsten.etherscan.io/";
  } else if (chainId === 42) {
    return "https://kovan.etherscan.io/";
  } else if (chainId === BSС_MAINNET) {
    return "https://bscscan.com/";
  } else if (chainId === BSС_TESTNET) {
    return "https://testnet.bscscan.com/";
  } else if (chainId === ARBITRUM) {
    return "https://arbiscan.io/";
  } else if (chainId === AVALANCHE) {
    return "https://snowtrace.io/";
  } else if (chainId === AVALANCHE_FUJI) {
    return "https://testnet.snowtrace.io/";
  }
  return "https://etherscan.io/";
}

export function getTokenExplorerUrl(chainId: number, tokenAddress: string) {
  return `${getExplorerUrl(chainId)}token/${tokenAddress}`;
}
