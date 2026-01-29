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
  AVALANCHE_FUJI,
  ContractsChainId,
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
import { LayerZeroEndpointId } from "domain/multichain/types";
import { numberToBigint } from "lib/numbers";
import { ISigner } from "lib/transactions/iSigner";
import { isSettlementChain, isSourceChain } from "sdk/configs/multichain";
import { convertTokenAddress, getTokenBySymbol } from "sdk/configs/tokens";

import platformTokensData from "./static/platformTokens.json";

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
  [ARBITRUM]: "0xca11bde05977b3631167028862be2a173976ca11",
  [AVALANCHE]: "0xca11bde05977b3631167028862be2a173976ca11",
  [ARBITRUM_SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
  [AVALANCHE_FUJI]: "0xca11bde05977b3631167028862be2a173976ca11",
};

/**
 * Compiled bytecode for MockUnlimitedToken
 * @see https://github.com/gmx-io/gmx-synthetics/blob/updates/contracts/mock/MockUnlimitedToken.sol
 */
export const OVERRIDE_ERC20_BYTECODE: Hex =
  "0x60806040526004361061008c5760003560e01c806306fdde0314610091578063095ea7b3146100e057806318160ddd1461011057806323b872dd146101335780632e1a7d4d14610153578063313ce5671461017557806370a082311461019157806395d89b41146101b1578063a9059cbb146101dd578063d0e30db0146101fd578063dd62ed3e14610205575b600080fd5b34801561009d57600080fd5b5060408051808201909152601481527326b7b1b5902ab73634b6b4ba32b2102a37b5b2b760611b60208201525b6040516100d79190610565565b60405180910390f35b3480156100ec57600080fd5b506101006100fb3660046105cf565b610225565b60405190151581526020016100d7565b34801561011c57600080fd5b50610125610292565b6040519081526020016100d7565b34801561013f57600080fd5b5061010061014e3660046105f9565b6102a6565b34801561015f57600080fd5b5061017361016e366004610636565b6103f5565b005b34801561018157600080fd5b50604051601281526020016100d7565b34801561019d57600080fd5b506101256101ac36600461064f565b610425565b3480156101bd57600080fd5b5060408051808201909152600381526213555560ea1b60208201526100ca565b3480156101e957600080fd5b506101006101f83660046105cf565b61045e565b6101736104fc565b34801561021157600080fd5b5061012561022036600461066a565b61052b565b3360008181526001602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906102809086815260200190565b60405180910390a35060015b92915050565b60006102a160026000196106c9565b905090565b60006102b2843361052b565b8211156103075760405162461bcd60e51b815260206004820152602a602482015260008051602061078883398151915260448201526920616c6c6f77616e636560b01b60648201526084015b60405180910390fd5b81610312853361052b565b61031c91906106dd565b6001600160a01b038516600090815260016020908152604080832033845290915290205561034984610425565b8211156103685760405162461bcd60e51b81526004016102fe906106f0565b8161037285610425565b61037c91906106dd565b6001600160a01b0385166000908152602081905260409020558161039f84610425565b6103a99190610726565b6001600160a01b03848116600081815260208181526040918290209490945551858152909291871691600080516020610768833981519152910160405180910390a35060019392505050565b80156104225760405181815260009033906000805160206107688339815191529060200160405180910390a35b50565b6001600160a01b03811660009081526020819052604081205480820361028c57610457600a6001600160ff1b03610739565b9392505050565b600061046933610425565b8211156104885760405162461bcd60e51b81526004016102fe906106f0565b8161049233610425565b61049c91906106dd565b33600090815260208190526040902055816104b684610425565b6104c09190610726565b6001600160a01b038416600081815260208181526040918290209390935551848152909133916000805160206107688339815191529101610280565b34156105295760405134815233906000906000805160206107688339815191529060200160405180910390a35b565b6001600160a01b0380831660009081526001602090815260408083209385168352929052908120548082036104575760001991505061028c565b602081526000825180602084015260005b818110156105935760208186018101516040868401015201610576565b506000604082850101526040601f19601f83011684010191505092915050565b80356001600160a01b03811681146105ca57600080fd5b919050565b600080604083850312156105e257600080fd5b6105eb836105b3565b946020939093013593505050565b60008060006060848603121561060e57600080fd5b610617846105b3565b9250610625602085016105b3565b929592945050506040919091013590565b60006020828403121561064857600080fd5b5035919050565b60006020828403121561066157600080fd5b610457826105b3565b6000806040838503121561067d57600080fd5b610686836105b3565b9150610694602084016105b3565b90509250929050565b634e487b7160e01b600052601260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b6000826106d8576106d861069d565b500490565b8181038181111561028c5761028c6106b3565b60208082526028908201526000805160206107888339815191526040820152672062616c616e636560c01b606082015260800190565b8082018082111561028c5761028c6106b3565b6000826107485761074861069d565b600160ff1b821460001984141615610762576107626106b3565b50059056feddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef4d6f636b556e6c696d69746564546f6b656e3a20496e73756666696369656e74a264697066735822122079d3c7e15a354a7a89245126dbc018edf10870d99c34fc72d4e8c7cf4e72ea3664736f6c634300081d0033";

export const CHAIN_ID_PREFERRED_DEPOSIT_TOKEN: Record<SettlementChainId, string> = {
  [ARBITRUM_SEPOLIA]: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", // USDC.SG
  [ARBITRUM]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  [AVALANCHE]: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
  [AVALANCHE_FUJI]: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F", // USDC
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
  [AVALANCHE_FUJI]: 40106,
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
