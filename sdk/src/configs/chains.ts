import { defineChain } from "viem";
import { arbitrum, avalanche, avalancheFuji, Chain } from "viem/chains";

export const AVALANCHE = 43114;
export const AVALANCHE_FUJI = 43113;
export const ARBITRUM = 42161;
export const ETH_MAINNET = 1;
export const BOTANIX = 3637;

export const SUPPORTED_CHAIN_IDS: UiSupportedChain[] = [ARBITRUM, AVALANCHE, BOTANIX];
export const SUPPORTED_CHAIN_IDS_DEV: UiSupportedChain[] = [...SUPPORTED_CHAIN_IDS, AVALANCHE_FUJI];

export type UiContractsChain = typeof ARBITRUM | typeof AVALANCHE | typeof AVALANCHE_FUJI | typeof BOTANIX;
export type UiSupportedChain = UiContractsChain;

export const CHAIN_NAMES_MAP: Record<UiContractsChain, string> = {
  [ARBITRUM]: "Arbitrum",
  [AVALANCHE]: "Avalanche",
  [AVALANCHE_FUJI]: "Avalanche Fuji",
  [BOTANIX]: "Botanix",
};

export const HIGH_EXECUTION_FEES_MAP: Record<UiContractsChain, number> = {
  [ARBITRUM]: 5, // 5 USD
  [AVALANCHE]: 5, // 5 USD
  [AVALANCHE_FUJI]: 5, // 5 USD
  [BOTANIX]: 5, // 5 USD
};

// added to maxPriorityFeePerGas
// applied to EIP-1559 transactions only
// is not applied to execution fee calculation
export const MAX_FEE_PER_GAS_MAP: Record<number, bigint> = {
  [AVALANCHE]: 200000000000n, // 200 gwei
  [BOTANIX]: 20n,
};

// added to maxPriorityFeePerGas
// applied to EIP-1559 transactions only
// is also applied to the execution fee calculation
export const GAS_PRICE_PREMIUM_MAP: Record<number, bigint> = {
  [ARBITRUM]: 0n,
  [AVALANCHE]: 6000000000n, // 6 gwei
};

/*
  that was a constant value in ethers v5, after ethers v6 migration we use it as a minimum for maxPriorityFeePerGas
*/
export const MAX_PRIORITY_FEE_PER_GAS_MAP: Record<UiSupportedChain, bigint | undefined> = {
  [ARBITRUM]: 1500000000n,
  [AVALANCHE]: 1500000000n,
  [AVALANCHE_FUJI]: 1500000000n,
  [BOTANIX]: 7n,
};

export const EXCESSIVE_EXECUTION_FEES_MAP: Record<UiSupportedChain, number> = {
  [ARBITRUM]: 10, // 10 USD
  [AVALANCHE]: 10, // 10 USD
  [AVALANCHE_FUJI]: 10, // 10 USD
  [BOTANIX]: 10, // 10 USD
};

// avoid botanix gas spikes when chain is not actively used
// if set, execution fee value should not be less than this in USD equivalent
export const MIN_EXECUTION_FEE_USD: Record<UiSupportedChain, bigint | undefined> = {
  [ARBITRUM]: undefined,
  [AVALANCHE]: undefined,
  [AVALANCHE_FUJI]: undefined,
  [BOTANIX]: 1000000000000000000000000000n, // 1e27 $0.001
};

// added to gasPrice
// applied to *non* EIP-1559 transactions only
//
// it is *not* applied to the execution fee calculation, and in theory it could cause issues
// if gas price used in the execution fee calculation is lower
// than the gas price used in the transaction (e.g. create order transaction)
// then the transaction will fail with InsufficientExecutionFee error.
// it is not an issue on Arbitrum though because the passed gas price does not affect the paid gas price.
// for example if current gas price is 0.1 gwei and UI passes 0.5 gwei the transaction
// Arbitrum will still charge 0.1 gwei per gas
//
// it doesn't make much sense to set this buffer higher than the execution fee buffer
// because if the paid gas price is higher than the gas price used in the execution fee calculation
// and the transaction will still fail with InsufficientExecutionFee
//
// this buffer could also cause issues on a blockchain that uses passed gas price
// especially if execution fee buffer and lower than gas price buffer defined bellow
export const GAS_PRICE_BUFFER_MAP: Record<number, bigint> = {
  [ARBITRUM]: 2000n, // 20%
};

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

const VIEM_CHAIN_BY_CHAIN_ID: Record<UiSupportedChain, Chain> = {
  [AVALANCHE_FUJI]: avalancheFuji,
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  [BOTANIX]: botanix,
};

export function getChainName(chainId: number) {
  return CHAIN_NAMES_MAP[chainId];
}

export const getViemChain = (chainId: number): Chain => {
  return VIEM_CHAIN_BY_CHAIN_ID[chainId];
};

export function getHighExecutionFee(chainId: number) {
  return HIGH_EXECUTION_FEES_MAP[chainId] ?? 5;
}

export function getExcessiveExecutionFee(chainId: number) {
  return EXCESSIVE_EXECUTION_FEES_MAP[chainId] ?? 10;
}

export function isSupportedChain(chainId: number, dev = false) {
  return (dev ? SUPPORTED_CHAIN_IDS_DEV : SUPPORTED_CHAIN_IDS).includes(chainId as UiSupportedChain);
}

export const EXECUTION_FEE_CONFIG_V2: {
  [chainId in UiSupportedChain]: {
    shouldUseMaxPriorityFeePerGas: boolean;
    defaultBufferBps?: number;
  };
} = {
  [AVALANCHE]: {
    shouldUseMaxPriorityFeePerGas: true,
    defaultBufferBps: 1000, // 10%
  },
  [AVALANCHE_FUJI]: {
    shouldUseMaxPriorityFeePerGas: true,
    defaultBufferBps: 1000, // 10%
  },
  [ARBITRUM]: {
    shouldUseMaxPriorityFeePerGas: false,
    defaultBufferBps: 3000, // 30%
  },
  [BOTANIX]: {
    shouldUseMaxPriorityFeePerGas: true,
    defaultBufferBps: 3000, // 30%
  },
};

export const GAS_LIMITS_STATIC_CONFIG: Record<
  UiSupportedChain,
  {
    createOrderGasLimit: bigint;
    updateOrderGasLimit: bigint;
    cancelOrderGasLimit: bigint;
    tokenPermitGasLimit: bigint;
  }
> = {
  [ARBITRUM]: {
    createOrderGasLimit: 1_000_000n,
    updateOrderGasLimit: 800_000n,
    cancelOrderGasLimit: 700_000n,
    tokenPermitGasLimit: 90_000n,
  },
  [AVALANCHE]: {
    createOrderGasLimit: 1_000_000n,
    updateOrderGasLimit: 800_000n,
    cancelOrderGasLimit: 700_000n,
    tokenPermitGasLimit: 90_000n,
  },
  [AVALANCHE_FUJI]: {
    createOrderGasLimit: 1_000_000n,
    updateOrderGasLimit: 800_000n,
    cancelOrderGasLimit: 700_000n,
    tokenPermitGasLimit: 90_000n,
  },
  [BOTANIX]: {
    createOrderGasLimit: 1_000_000n,
    updateOrderGasLimit: 800_000n,
    cancelOrderGasLimit: 700_000n,
    tokenPermitGasLimit: 90_000n,
  },
};
