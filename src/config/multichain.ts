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
import type { Abi, Hex } from "viem";
import { maxUint256, zeroAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  ContractsChainId,
  SettlementChainId,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SourceChainId,
} from "config/chains";
import { isDevelopment } from "config/env";
import { LayerZeroEndpointId } from "domain/multichain/types";
import { numberToBigint } from "lib/numbers";
import { ISigner } from "lib/transactions/iSigner";
import { isSettlementChain, isSourceChain, SOURCE_CHAINS } from "sdk/configs/multichain";
import { convertTokenAddress, getTokenBySymbol } from "sdk/configs/tokens";

import platformTokensData from "./static/platformTokens.json";

export * from "sdk/configs/multichain";

export {
  ethPoolArbitrumSepolia,
  ethPoolOptimismSepolia,
  ethPoolSepolia,
  usdcSgPoolArbitrumSepolia,
  usdcSgPoolOptimismSepolia,
  usdcSgPoolSepolia,
};

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
        AnyChainId,
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
    tokenGroups[symbol]![chainIdString] = {
      address: chainAddresses[chainIdString].address,
      decimals: 18,
      chainId: parseInt(chainIdString) as SettlementChainId | SourceChainId,
      stargate: chainAddresses[chainIdString].stargate,
      symbol: symbol,
      isPlatformToken: true,
    } satisfies MultichainTokenId;
  }
}

export const DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT = false;

if (isDevelopment() && DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT) {
  SOURCE_CHAINS.push(ARBITRUM_SEPOLIA as SourceChainId, ARBITRUM as SourceChainId, AVALANCHE as SourceChainId);
}

export const MULTI_CHAIN_TOKEN_MAPPING = {} as MultichainTokenMapping;
export const MULTI_CHAIN_DEPOSIT_TRADE_TOKENS = {} as Record<SettlementChainId, string[]>;
export const MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS = {} as Record<SettlementChainId, string[]>;
export const MULTI_CHAIN_PLATFORM_TOKENS_MAP = {} as Record<SettlementChainId, string[]>;

export const CHAIN_ID_TO_TOKEN_ID_MAP: Record<
  SettlementChainId | SourceChainId,
  Record<string, MultichainTokenId>
> = {} as any;

export const MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING: MultichainSourceToSettlementsMap = {} as any;

for (const tokenSymbol in TOKEN_GROUPS) {
  for (const chainIdString in TOKEN_GROUPS[tokenSymbol]) {
    const firstChainId = parseInt(chainIdString) as SettlementChainId | SourceChainId;

    const tokenId = TOKEN_GROUPS[tokenSymbol]![firstChainId]!;

    if (!tokenId) {
      continue;
    }

    CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId] = CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId] || {};
    CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId][tokenId.address] = tokenId;

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
      if (!isSourceChain(sourceChainId)) {
        continue;
      }

      if (!isDevelopment() && (settlementChainId as number) === (sourceChainId as number)) {
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
      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainIdString] =
        MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainIdString] || {};

      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainIdString][sourceChainToken.address] = {
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
  return CHAIN_ID_TO_TOKEN_ID_MAP[chainId]?.[tokenAddress];
}

export function getStargatePoolAddress(chainId: number, tokenAddress: string): string | undefined {
  const tokenId = getMultichainTokenId(chainId, tokenAddress);

  if (!tokenId) return undefined;

  return tokenId.stargate;
}

export function getLayerZeroEndpointId(chainId: number): LayerZeroEndpointId | undefined {
  return CHAIN_ID_TO_ENDPOINT_ID[chainId];
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

export const MULTICALLS_MAP: Record<SourceChainId, string> = {
  [SOURCE_ETHEREUM_MAINNET]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_OPTIMISM_SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_BASE_MAINNET]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SOURCE_BSC_MAINNET]: "0xca11bde05977b3631167028862be2a173976ca11",
};

if (isDevelopment() && DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT) {
  MULTICALLS_MAP[ARBITRUM_SEPOLIA as SourceChainId] = "0xca11bde05977b3631167028862be2a173976ca11";
  MULTICALLS_MAP[ARBITRUM as SourceChainId] = "0xca11bde05977b3631167028862be2a173976ca11";
}

/**
 * Compiled bytecode for MockUnlimitedToken
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/mock/MockUnlimitedToken.sol
 */
export const OVERRIDE_ERC20_BYTECODE: Hex =
  "0x608060405234801561001057600080fd5b50600436106100835760003560e01c806306fdde0314610088578063095ea7b3146100ca57806318160ddd146100ed57806323b872dd14610103578063313ce5671461011657806370a082311461012557806395d89b4114610138578063a9059cbb14610157578063dd62ed3e1461016a575b600080fd5b60408051808201909152601481527326b7b1b5902ab73634b6b4ba32b2102a37b5b2b760611b60208201525b6040516100c191906103ae565b60405180910390f35b6100dd6100d8366004610418565b61017d565b60405190151581526020016100c1565b6100f56101ea565b6040519081526020016100c1565b6100dd610111366004610442565b6101fe565b604051601281526020016100c1565b6100f561013336600461047e565b6102c6565b60408051808201909152600381526213555560ea1b60208201526100b4565b6100dd610165366004610418565b6102fa565b6100f5610178366004610499565b610374565b3360008181526001602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906101d89086815260200190565b60405180910390a35060015b92915050565b60006101f960026000196104e2565b905090565b60008161020b8533610374565b6102159190610504565b6001600160a01b038516600090815260016020908152604080832033845290915290205581610243856102c6565b61024d9190610504565b6001600160a01b03851660009081526020819052604090205581610270846102c6565b61027a9190610517565b6001600160a01b0384811660008181526020818152604091829020949094555185815290929187169160008051602061052b833981519152910160405180910390a35060019392505050565b6001600160a01b0381166000908152602081905260408120548082036101e4576102f360026000196104e2565b9392505050565b600081610306336102c6565b6103109190610504565b33600081815260208190526040902091909155829061032e906102c6565b6103389190610517565b6001600160a01b0384166000818152602081815260409182902093909355518481529091339160008051602061052b83398151915291016101d8565b6001600160a01b0380831660009081526001602090815260408083209385168352929052908120548082036102f3576000199150506101e4565b600060208083528351808285015260005b818110156103db578581018301518582016040015282016103bf565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461041357600080fd5b919050565b6000806040838503121561042b57600080fd5b610434836103fc565b946020939093013593505050565b60008060006060848603121561045757600080fd5b610460846103fc565b925061046e602085016103fc565b9150604084013590509250925092565b60006020828403121561049057600080fd5b6102f3826103fc565b600080604083850312156104ac57600080fd5b6104b5836103fc565b91506104c3602084016103fc565b90509250929050565b634e487b7160e01b600052601160045260246000fd5b6000826104ff57634e487b7160e01b600052601260045260246000fd5b500490565b818103818111156101e4576101e46104cc565b808201808211156101e4576101e46104cc56feddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa26469706673582212207e80951b693900018ccbef67c898d93845d4dd2e0d8bee24a96e72ecb4b5a8bd64736f6c63430008140033";

export const CHAIN_ID_PREFERRED_DEPOSIT_TOKEN: Record<SettlementChainId, string> = {
  [ARBITRUM_SEPOLIA]: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", // USDC.SG
  [ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  [AVALANCHE]: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
};

export const MULTICHAIN_FUNDING_SLIPPAGE_BPS = 50;

export const StargateErrorsAbi = _StargateErrorsAbi as Abi;

export const CHAIN_ID_TO_ENDPOINT_ID: Record<SettlementChainId | SourceChainId, LayerZeroEndpointId> = {
  [ARBITRUM_SEPOLIA]: 40231,
  [SOURCE_SEPOLIA]: 40161,
  [SOURCE_OPTIMISM_SEPOLIA]: 40232,
  [ARBITRUM]: 30110,
  [SOURCE_ETHEREUM_MAINNET]: 30101,
  [SOURCE_BASE_MAINNET]: 30184,
  [AVALANCHE]: 30106,
  [SOURCE_BSC_MAINNET]: 30102,
};

export const ENDPOINT_ID_TO_CHAIN_ID: Partial<Record<LayerZeroEndpointId, SettlementChainId | SourceChainId>> =
  mapValues(invert(CHAIN_ID_TO_ENDPOINT_ID), (value) => parseInt(value));

export const FAKE_INPUT_AMOUNT_MAP: Record<string, bigint> = {
  "USDC.SG": numberToBigint(1, getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG").decimals),
  ETH: numberToBigint(0.0015, getTokenBySymbol(ARBITRUM_SEPOLIA, "ETH").decimals),
  USDC: numberToBigint(1, getTokenBySymbol(ARBITRUM, "USDC").decimals),
  USDT: numberToBigint(1, getTokenBySymbol(ARBITRUM, "USDT").decimals),
};

export const RANDOM_SLOT = "0x23995301f0ea59f7cace2ae906341fc4662f3f5d23f124431ee3520d1070148c";
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
