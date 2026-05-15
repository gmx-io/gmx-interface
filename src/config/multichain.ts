import { errors as _StargateErrorsAbi } from "@stargatefinance/stg-evm-sdk-v2";
import { address as ethPoolArbitrum } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbitrum-mainnet/StargatePoolNative.json";
import { address as usdcPoolArbitrum } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbitrum-mainnet/StargatePoolUSDC.json";
import { address as usdtPoolArbitrum } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbitrum-mainnet/StargatePoolUSDT.json";
import { address as ethPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolNative.json";
import { address as usdcSgPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolUSDC.json";
import { address as usdtPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolUSDT.json";
import { address as usdcPoolAvalanche } from "@stargatefinance/stg-evm-sdk-v2/deployments/avalanche-mainnet/StargatePoolUSDC.json";
import { address as usdtPoolAvalanche } from "@stargatefinance/stg-evm-sdk-v2/deployments/avalanche-mainnet/StargatePoolUSDT.json";
import { address as ethPoolBase } from "@stargatefinance/stg-evm-sdk-v2/deployments/base-mainnet/StargatePoolNative.json";
import { address as usdcPoolBase } from "@stargatefinance/stg-evm-sdk-v2/deployments/base-mainnet/StargatePoolUSDC.json";
import { address as usdcPoolBsc } from "@stargatefinance/stg-evm-sdk-v2/deployments/bsc-mainnet/StargatePoolUSDC.json";
import { address as usdtPoolBsc } from "@stargatefinance/stg-evm-sdk-v2/deployments/bsc-mainnet/StargatePoolUSDT.json";
import { address as ethPoolEthereum } from "@stargatefinance/stg-evm-sdk-v2/deployments/ethereum-mainnet/StargatePoolNative.json";
import { address as usdcPoolEthereum } from "@stargatefinance/stg-evm-sdk-v2/deployments/ethereum-mainnet/StargatePoolUSDC.json";
import { address as usdtPoolEthereum } from "@stargatefinance/stg-evm-sdk-v2/deployments/ethereum-mainnet/StargatePoolUSDT.json";
import { address as ethPoolOptimismSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/optsep-testnet/StargatePoolNative.json";
import { address as usdcSgPoolOptimismSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/optsep-testnet/StargatePoolUSDC.json";
import { address as ethPoolSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/sepolia-testnet/StargatePoolNative.json";
import { address as usdcSgPoolSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/sepolia-testnet/StargatePoolUSDC.json";
import { address as usdtPoolSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/sepolia-testnet/StargatePoolUSDT.json";
import invert from "lodash/invert";
import mapValues from "lodash/mapValues";
import uniq from "lodash/uniq";
import type { Abi } from "viem";
import { maxUint256, zeroAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  ContractsChainId,
  MEGAETH,
  SETTLEMENT_CHAIN_IDS,
  SETTLEMENT_CHAIN_IDS_DEV,
  SettlementChainId,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SourceChainId,
} from "config/chains";
import { isDevelopment } from "config/env";
import { numberToBigint } from "lib/numbers";
import { ISigner } from "lib/transactions/iSigner";
import platformTokensData from "sdk/codegen/platformTokens.json";
import { getContract } from "sdk/configs/contracts";
import { CHAIN_ID_TO_ENDPOINT_ID, isSettlementChain, isSourceChain, LayerZeroEndpointId } from "sdk/configs/multichain";
import { convertTokenAddress, getTokenBySymbol } from "sdk/configs/tokens";

export * from "sdk/configs/multichain";

export type MultichainTokenMapping = Record<
  // settlement chain id
  SettlementChainId,
  Record<
    // source chain id
    SourceChainId,
    Record<
      // source chain token address
      string,
      {
        settlementChainTokenAddress: string;

        sourceChainTokenAddress: string;
        sourceChainTokenDecimals: number;
      }
    >
  >
>;

type MultichainSourceToSettlementsMap = Record<SourceChainId, SettlementChainId[]>;

export type MultichainTokenId = {
  chainId: SettlementChainId | SourceChainId;
  address: string;
  decimals: number;
  stargate: string;
  symbol: string;
  isTestnet?: boolean;
  isPlatformToken?: boolean;
};

export const SETTLEMENT_CHAINS: SettlementChainId[] = isDevelopment()
  ? (SETTLEMENT_CHAIN_IDS_DEV as unknown as SettlementChainId[])
  : (SETTLEMENT_CHAIN_IDS as unknown as SettlementChainId[]);

const TOKEN_GROUPS: Partial<Record<string, Partial<Record<SourceChainId | SettlementChainId, MultichainTokenId>>>> = {
  ["USDC"]: {
    [ARBITRUM]: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
      chainId: ARBITRUM,
      stargate: usdcPoolArbitrum,
      symbol: "USDC",
    },
    [AVALANCHE]: {
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      chainId: AVALANCHE,
      stargate: usdcPoolAvalanche,
      symbol: "USDC",
    },
    [SOURCE_BASE_MAINNET]: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      chainId: SOURCE_BASE_MAINNET,
      stargate: usdcPoolBase,
      symbol: "USDC",
    },
    [SOURCE_BSC_MAINNET]: {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
      chainId: SOURCE_BSC_MAINNET,
      stargate: usdcPoolBsc,
      symbol: "USDC",
    },
    [SOURCE_ETHEREUM_MAINNET]: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      chainId: SOURCE_ETHEREUM_MAINNET,
      stargate: usdcPoolEthereum,
      symbol: "USDC",
    },
  },
  ["USDT"]: {
    [ARBITRUM]: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
      chainId: ARBITRUM,
      stargate: usdtPoolArbitrum,
      symbol: "USDT",
    },
    [AVALANCHE]: {
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      decimals: 6,
      chainId: AVALANCHE,
      stargate: usdtPoolAvalanche,
      symbol: "USDT",
    },
    [SOURCE_BSC_MAINNET]: {
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      chainId: SOURCE_BSC_MAINNET,
      stargate: usdtPoolBsc,
      symbol: "USDT",
    },
    [SOURCE_ETHEREUM_MAINNET]: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
      chainId: SOURCE_ETHEREUM_MAINNET,
      stargate: usdtPoolEthereum,
      symbol: "USDT",
    },
  },
  ["ETH"]: {
    [ARBITRUM]: {
      address: zeroAddress,
      decimals: 18,
      chainId: ARBITRUM,
      stargate: ethPoolArbitrum,
      symbol: "ETH",
    },
    [SOURCE_BASE_MAINNET]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_BASE_MAINNET,
      stargate: ethPoolBase,
      symbol: "ETH",
    },
    [SOURCE_ETHEREUM_MAINNET]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_ETHEREUM_MAINNET,
      stargate: ethPoolEthereum,
      symbol: "ETH",
    },
  },
};

for (const [symbol, chainAddresses] of Object.entries(platformTokensData.mainnets)) {
  addMultichainPlatformTokenConfig(TOKEN_GROUPS, {
    symbol,
    chainAddresses,
  });
}

if (isDevelopment()) {
  TOKEN_GROUPS["USDC.SG"] = {
    ...TOKEN_GROUPS["USDC.SG"],
    [ARBITRUM_SEPOLIA]: {
      address: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
      decimals: 6,
      chainId: ARBITRUM_SEPOLIA,
      stargate: usdcSgPoolArbitrumSepolia,
      symbol: "USDC.SG",
      isTestnet: true,
    },
    [SOURCE_OPTIMISM_SEPOLIA]: {
      address: "0x488327236B65C61A6c083e8d811a4E0D3d1D4268",
      decimals: 6,
      chainId: SOURCE_OPTIMISM_SEPOLIA,
      stargate: usdcSgPoolOptimismSepolia,
      symbol: "USDC.SG",
      isTestnet: true,
    },
    [SOURCE_SEPOLIA]: {
      address: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
      decimals: 6,
      chainId: SOURCE_SEPOLIA,
      stargate: usdcSgPoolSepolia,
      symbol: "USDC.SG",
      isTestnet: true,
    },
  };

  TOKEN_GROUPS["ETH"] = {
    ...TOKEN_GROUPS["ETH"],
    [ARBITRUM_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: ARBITRUM_SEPOLIA,
      stargate: ethPoolArbitrumSepolia,
      symbol: "ETH",
      isTestnet: true,
    },
    [SOURCE_OPTIMISM_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_OPTIMISM_SEPOLIA,
      stargate: ethPoolOptimismSepolia,
      symbol: "ETH",
      isTestnet: true,
    },
    [SOURCE_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SOURCE_SEPOLIA,
      stargate: ethPoolSepolia,
      symbol: "ETH",
      isTestnet: true,
    },
  };

  TOKEN_GROUPS["USDT"] = {
    ...TOKEN_GROUPS["USDT"],
    [ARBITRUM_SEPOLIA]: {
      address: "0x095f40616FA98Ff75D1a7D0c68685c5ef806f110",
      decimals: 6,
      chainId: ARBITRUM_SEPOLIA,
      stargate: usdtPoolArbitrumSepolia,
      symbol: "USDT",
      isTestnet: true,
    },
    [SOURCE_SEPOLIA]: {
      address: "0xF3F2b4815A58152c9BE53250275e8211163268BA",
      decimals: 6,
      chainId: SOURCE_SEPOLIA,
      stargate: usdtPoolSepolia,
      symbol: "USDT",
      isTestnet: true,
    },
  };

  for (const [symbol, chainAddresses] of Object.entries(platformTokensData.testnets)) {
    addMultichainPlatformTokenConfig(TOKEN_GROUPS, {
      symbol,
      chainAddresses,
    });
  }
}

function addMultichainPlatformTokenConfig(
  tokenGroups: typeof TOKEN_GROUPS,
  {
    symbol,
    chainAddresses,
  }: {
    symbol: string;
    chainAddresses: Partial<
      Record<
        SettlementChainId | SourceChainId,
        {
          address: string;
          stargate: string;
        }
      >
    >;
  }
) {
  tokenGroups[symbol] = {};

  for (const chainIdString in chainAddresses) {
    const chainIdKey = chainIdString as unknown as SettlementChainId | SourceChainId;
    tokenGroups[symbol]![chainIdKey] = {
      address: chainAddresses[chainIdKey]!.address,
      decimals: 18,
      chainId: chainIdKey,
      stargate: chainAddresses[chainIdKey]!.stargate,
      symbol: symbol,
      isPlatformToken: true,
    } satisfies MultichainTokenId;
  }
}

export const MULTI_CHAIN_TOKEN_MAPPING = {} as MultichainTokenMapping;
export const MULTI_CHAIN_DEPOSIT_TRADE_TOKENS = {} as Record<SettlementChainId, string[]>;
export const MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS = {} as Record<SettlementChainId, string[]>;
export const MULTI_CHAIN_PLATFORM_TOKENS_MAP = {} as Record<SettlementChainId, string[]>;

export const CHAIN_ID_TO_TOKEN_ID_MAP: Partial<Record<AnyChainId, Record<string, MultichainTokenId>>> = {} as any;

export const MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING: MultichainSourceToSettlementsMap = {} as any;

for (const tokenSymbol in TOKEN_GROUPS) {
  for (const chainIdString in TOKEN_GROUPS[tokenSymbol]) {
    const firstChainId = parseInt(chainIdString) as SettlementChainId | SourceChainId;

    const tokenId = TOKEN_GROUPS[tokenSymbol]![firstChainId]!;

    if (!tokenId) {
      continue;
    }

    CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId] = CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId] || {};
    CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId]![tokenId.address] = tokenId;

    if (!isSettlementChain(firstChainId)) {
      continue;
    }

    const settlementChainId = firstChainId;

    if (!tokenId?.isPlatformToken) {
      MULTI_CHAIN_DEPOSIT_TRADE_TOKENS[settlementChainId] = MULTI_CHAIN_DEPOSIT_TRADE_TOKENS[settlementChainId] || [];
      MULTI_CHAIN_DEPOSIT_TRADE_TOKENS[settlementChainId].push(tokenId.address);
      MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[settlementChainId] =
        MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[settlementChainId] || [];
      MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS[settlementChainId].push(
        convertTokenAddress(settlementChainId, tokenId.address, "wrapped")
      );
    }

    for (const sourceChainIdString in TOKEN_GROUPS[tokenSymbol]) {
      const sourceChainId = parseInt(sourceChainIdString) as SettlementChainId | SourceChainId;
      if (!isSourceChain(sourceChainId, settlementChainId)) {
        continue;
      }

      if ((settlementChainId as number) === (sourceChainId as number)) {
        continue;
      }

      const sourceChainToken = TOKEN_GROUPS[tokenSymbol]![sourceChainId]!;

      if (Boolean(tokenId?.isTestnet) !== Boolean(sourceChainToken?.isTestnet)) {
        continue;
      }

      MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[sourceChainId] =
        MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[sourceChainId] || [];
      MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[sourceChainId] = uniq(
        MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[sourceChainId].concat(settlementChainId)
      );

      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId] = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId] || {};
      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainId] =
        MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainId] || {};

      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainId]![sourceChainToken.address] = {
        settlementChainTokenAddress: tokenId.address,
        sourceChainTokenAddress: sourceChainToken.address,
        sourceChainTokenDecimals: sourceChainToken.decimals,
      };
    }

    if (tokenId?.isPlatformToken) {
      MULTI_CHAIN_PLATFORM_TOKENS_MAP[settlementChainId] = MULTI_CHAIN_PLATFORM_TOKENS_MAP[settlementChainId] || [];
      MULTI_CHAIN_PLATFORM_TOKENS_MAP[settlementChainId].push(tokenId.address);
    }
  }
}

export function getMultichainTokenId(chainId: number, tokenAddress: string): MultichainTokenId | undefined {
  return CHAIN_ID_TO_TOKEN_ID_MAP[chainId as AnyChainId]?.[tokenAddress];
}

export function getStargatePoolAddress(chainId: number, tokenAddress: string): string | undefined {
  const tokenId = getMultichainTokenId(chainId, tokenAddress);

  if (!tokenId) return undefined;

  return tokenId.stargate;
}

export function getMappedTokenId(
  fromChainId: SettlementChainId | SourceChainId,
  fromChainTokenAddress: string,
  toChainId: SettlementChainId | SourceChainId
): MultichainTokenId | undefined {
  const tokenId = getMultichainTokenId(fromChainId, fromChainTokenAddress);

  if (!tokenId) return undefined;

  const symbol = tokenId.symbol;

  const mappedTokenId = TOKEN_GROUPS[symbol]?.[toChainId];

  return mappedTokenId;
}

export const MULTICALLS_MAP: Record<AnyChainId, string> = {
  [SOURCE_ETHEREUM_MAINNET]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_OPTIMISM_SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_BASE_MAINNET]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_BSC_MAINNET]: "0xca11bde05977b3631167028862be2a173976ca11",
  [ARBITRUM]: getContract(ARBITRUM, "Multicall"),
  [AVALANCHE]: getContract(AVALANCHE, "Multicall"),
  [ARBITRUM_SEPOLIA]: getContract(ARBITRUM_SEPOLIA, "Multicall"),
  [AVALANCHE_FUJI]: getContract(AVALANCHE_FUJI, "Multicall"),
  [BOTANIX]: getContract(BOTANIX, "Multicall"),
  [MEGAETH]: getContract(MEGAETH, "Multicall"),
};

export const CHAIN_ID_PREFERRED_DEPOSIT_TOKEN: Record<SettlementChainId, string> = {
  [ARBITRUM_SEPOLIA]: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", // USDC.SG
  [ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  [AVALANCHE]: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
  [AVALANCHE_FUJI]: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F", // USDC
};

export const MULTICHAIN_FUNDING_SLIPPAGE_BPS = 50;

export const StargateErrorsAbi = _StargateErrorsAbi as Abi;

export const ENDPOINT_ID_TO_CHAIN_ID: Partial<Record<LayerZeroEndpointId, SettlementChainId | SourceChainId>> =
  mapValues(invert(CHAIN_ID_TO_ENDPOINT_ID), (value) => parseInt(value));

export const FAKE_INPUT_AMOUNT_MAP: Record<string, bigint> = {
  "USDC.SG": numberToBigint(1, getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG").decimals),
  ETH: numberToBigint(0.0015, getTokenBySymbol(ARBITRUM_SEPOLIA, "ETH").decimals),
  USDC: numberToBigint(1, getTokenBySymbol(ARBITRUM, "USDC").decimals),
  USDT: numberToBigint(1, getTokenBySymbol(ARBITRUM, "USDT").decimals),
};

export const RANDOM_ACCOUNT = privateKeyToAccount(generatePrivateKey());
export const RANDOM_WALLET: ISigner = ISigner.fromPrivateKeyAccount(RANDOM_ACCOUNT);

/**
 * Uses maxUint256 / 100n to avoid number overflows in EVM operations.
 */
export const SIMULATED_MULTICHAIN_BALANCE = maxUint256 / 100n;

export function getSourceChainDecimalsMapped(
  chainId: ContractsChainId,
  srcChainId: SourceChainId,
  tokenAddress: string
): number | undefined {
  const tokenId = getMappedTokenId(chainId as SettlementChainId, tokenAddress, srcChainId as SourceChainId);
  return tokenId?.decimals;
}
