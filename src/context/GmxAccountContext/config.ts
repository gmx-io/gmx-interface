import { EndpointId } from "@layerzerolabs/lz-definitions";
import uniq from "lodash/uniq";
import { Address, zeroAddress } from "viem";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BASE_MAINNET,
  OPTIMISM_SEPOLIA,
  SEPOLIA,
  SONIC_MAINNET,
  UiSettlementChain,
  UiSourceChain,
  UiSupportedChain,
} from "config/chains";
import { isDevelopment } from "config/env";

import {
  CHAIN_ID_TO_ENDPOINT_ID,
  ethPoolArbitrumSepolia,
  ethPoolOptimismSepolia,
  ethPoolSepolia,
  usdcSgPoolArbitrumSepolia,
  usdcSgPoolOptimismSepolia,
  usdcSgPoolSepolia,
} from "./stargatePools";

// we need to have a token bare config for each chain and map it to the settlement chain token

// So we need to have address and decimals for sonic and know how to map it to arbitrum

type MultichainTokenMapping = Record<
  // settlement chain id
  number,
  Record<
    // source chain id
    number,
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

type MultichainDepositSupportedTokens = Record<
  // settlement chain id
  number,
  MultichainTokenId[]
>;

type MultichainSupportedTokenMap = Record<
  // settlement chain id
  number,
  Record<
    // source chain id
    number,
    // source chain token address
    string[]
  >
>;

type MultichainWithdrawSupportedTokens = Record<
  // settlement chain id
  number,
  // settlement chain token address
  string[]
>;

type MultichainSourceToSettlementChainMapping = Record<UiSourceChain, UiSettlementChain[]>;

type MultichainTokenId = {
  chainId: number;
  address: string;
  decimals: number;
  stargate: Address;
  symbol: string;
};

const TOKEN_GROUPS: Partial<Record<string, Partial<Record<UiSourceChain | UiSettlementChain, MultichainTokenId>>>> = {};
// USDC - prod
// [
//   {
//     chainId: ARBITRUM,
//     address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
//     decimals: 6,
//   },
//   {
//     chainId: AVALANCHE,
//     address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
//     decimals: 6,
//   },
//   {
//     chainId: BASE_MAINNET,
//     address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
//     decimals: 6,
//   },
//   {
//     chainId: SONIC_MAINNET,
//     // Technically this is USDC.e
//     address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
//     decimals: 6,
//   },
// ],
// // WETH - prod
// [
//   {
//     chainId: ARBITRUM,
//     address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//     decimals: 18,
//   },
//   {
//     chainId: AVALANCHE,
//     address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
//     decimals: 18,
//   },
//   {
//     chainId: BASE_MAINNET,
//     address: "0x4200000000000000000000000000000000000006",
//     decimals: 18,
//   },
//   {
//     chainId: SONIC_MAINNET,
//     address: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
//     decimals: 18,
//   },
// ],
// // BTC - prod
// [
//   {
//     chainId: ARBITRUM,
//     address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
//     decimals: 8,
//   },
//   {
//     chainId: AVALANCHE,
//     address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
//     decimals: 8,
//   },
//   {
//     chainId: BASE_MAINNET,
//     address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
//     decimals: 8,
//   },
//   {
//     chainId: SONIC_MAINNET,
//     address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
//     decimals: 8,
//   },
// ],

if (isDevelopment()) {
  TOKEN_GROUPS["USDC.SG"] = {
    [ARBITRUM_SEPOLIA]: {
      address: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
      decimals: 6,
      chainId: ARBITRUM_SEPOLIA,
      stargate: usdcSgPoolArbitrumSepolia as Address,
      symbol: "USDC.SG",
    },
    [OPTIMISM_SEPOLIA]: {
      address: "0x488327236B65C61A6c083e8d811a4E0D3d1D4268",
      decimals: 6,
      chainId: OPTIMISM_SEPOLIA,
      stargate: usdcSgPoolOptimismSepolia as Address,
      symbol: "USDC.SG",
    },
    [SEPOLIA]: {
      address: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
      decimals: 6,
      chainId: SEPOLIA,
      stargate: usdcSgPoolSepolia as Address,
      symbol: "USDC.SG",
    },
  };

  TOKEN_GROUPS["ETH"] = {
    [ARBITRUM_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: ARBITRUM_SEPOLIA,
      stargate: ethPoolArbitrumSepolia as Address,
      symbol: "ETH",
    },
    [OPTIMISM_SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: OPTIMISM_SEPOLIA,
      stargate: ethPoolOptimismSepolia as Address,
      symbol: "ETH",
    },
    [SEPOLIA]: {
      address: zeroAddress,
      decimals: 18,
      chainId: SEPOLIA,
      stargate: ethPoolSepolia as Address,
      symbol: "ETH",
    },
  };

  TOKEN_GROUPS["WETH"] = {
    [ARBITRUM_SEPOLIA]: {
      address: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
      decimals: 18,
      chainId: ARBITRUM_SEPOLIA,
      stargate: ethPoolArbitrumSepolia as Address,
      symbol: "WETH",
    },
  };
}

export const DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT = true;

export const SETTLEMENT_CHAINS: UiSettlementChain[] = !isDevelopment()
  ? []
  : (Object.keys({
      [ARBITRUM_SEPOLIA]: true,
    } satisfies Record<UiSettlementChain, true>).map(Number) as UiSettlementChain[]);

// To test bridge in from the same network add ARBITRUM_SEPOLIA to source chains
export const SOURCE_CHAINS: UiSourceChain[] = !isDevelopment()
  ? []
  : (Object.keys({
      [OPTIMISM_SEPOLIA]: true,
      [SEPOLIA]: true,
    } satisfies Record<UiSourceChain, true>).map(Number) as UiSourceChain[]);

if (isDevelopment() && DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT) {
  SOURCE_CHAINS.push(ARBITRUM_SEPOLIA as UiSourceChain);
}

export function isSettlementChain(chainId: number): chainId is UiSettlementChain {
  return SETTLEMENT_CHAINS.includes(chainId as UiSettlementChain);
}

export function isSourceChain(chainId: number): chainId is UiSourceChain {
  return SOURCE_CHAINS.includes(chainId as UiSourceChain);
}

export const MULTI_CHAIN_TOKEN_MAPPING: MultichainTokenMapping = {};

export const MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS: MultichainDepositSupportedTokens = {};
export const MULTI_CHAIN_SUPPORTED_TOKEN_MAP: MultichainSupportedTokenMap = {};

export const MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS: MultichainWithdrawSupportedTokens = {};

export const CHAIN_ID_TO_TOKEN_ID_MAP: Record<
  UiSettlementChain | UiSourceChain,
  Record<string, MultichainTokenId>
> = {} as any;

export const MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING: MultichainSourceToSettlementChainMapping = {} as any;

for (const tokenSymbol in TOKEN_GROUPS) {
  for (const settlementChainIdString in TOKEN_GROUPS[tokenSymbol]) {
    const settlementChainId = parseInt(settlementChainIdString) as UiSettlementChain | UiSourceChain;
    if (!isSettlementChain(settlementChainId)) continue;

    let empty = true;
    for (const sourceChainIdString in TOKEN_GROUPS[tokenSymbol]) {
      const sourceChainId = parseInt(sourceChainIdString) as UiSettlementChain | UiSourceChain;
      if (!isSourceChain(sourceChainId)) continue;

      if (!isDevelopment() && (settlementChainId as number) === (sourceChainId as number)) continue;
      empty = false;

      MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[sourceChainId] =
        MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[sourceChainId] || [];
      MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[sourceChainId].push(settlementChainId);
      MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[sourceChainId] = uniq(
        MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[sourceChainId]
      );

      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId] = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId] || {};
      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainIdString] =
        MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainIdString] || {};

      const settlementToken = TOKEN_GROUPS[tokenSymbol]?.[settlementChainId];

      if (!settlementToken) continue;

      const sourceChainToken = TOKEN_GROUPS[tokenSymbol]?.[sourceChainId];

      if (!sourceChainToken) continue;

      MULTI_CHAIN_TOKEN_MAPPING[settlementChainId][sourceChainIdString][sourceChainToken.address] = {
        settlementChainTokenAddress: settlementToken.address,
        sourceChainTokenAddress: sourceChainToken.address,
        sourceChainTokenDecimals: sourceChainToken.decimals,
      };

      MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementChainId] =
        MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementChainId] || [];
      MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementChainId].push(sourceChainToken);
    }

    if (!empty) {
      const settlementToken = TOKEN_GROUPS[tokenSymbol]?.[settlementChainId];

      if (!settlementToken) continue;

      MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementChainId] =
        MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementChainId] || [];
      MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementChainId].push(settlementToken.address);
    }
  }
}

for (const tokenSymbol in TOKEN_GROUPS) {
  for (const firstChainIdString in TOKEN_GROUPS[tokenSymbol]) {
    const firstChainId = parseInt(firstChainIdString) as UiSettlementChain | UiSourceChain;

    const firstTokenId = TOKEN_GROUPS[tokenSymbol]?.[firstChainId];

    if (!firstTokenId) continue;

    CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId] = CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId] || {};
    CHAIN_ID_TO_TOKEN_ID_MAP[firstChainId][firstTokenId.address] = firstTokenId;

    for (const secondChainIdString in TOKEN_GROUPS[tokenSymbol]) {
      const secondChainId = parseInt(secondChainIdString) as UiSettlementChain | UiSourceChain;
      if (!isDevelopment() && firstChainId === secondChainId) continue;

      if (isSettlementChain(firstChainId) && isSourceChain(secondChainId)) {
        const secondTokenId = TOKEN_GROUPS[tokenSymbol]?.[secondChainId];

        if (!secondTokenId) continue;

        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId] = MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId] || {};
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId][secondChainId] =
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId][secondChainId] || [];

        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId][secondChainId].push(secondTokenId.address);
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId][secondChainId] = uniq(
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstChainId][secondChainId]
        );
      }

      if (isSourceChain(firstChainId) && isSettlementChain(secondChainId)) {
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId] = MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId] || {};
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId][firstChainId] =
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId][firstChainId] || [];

        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId][firstChainId].push(firstTokenId.address);
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId][firstChainId] = uniq(
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondChainId][firstChainId]
        );
      }
    }
  }
}

export const DEFAULT_SETTLEMENT_CHAIN_ID_MAP: Record<UiSupportedChain, UiSettlementChain> = {
  [BASE_MAINNET]: ARBITRUM,
  [SONIC_MAINNET]: ARBITRUM,

  [ARBITRUM_SEPOLIA]: ARBITRUM_SEPOLIA,
  [OPTIMISM_SEPOLIA]: ARBITRUM_SEPOLIA,
  [SEPOLIA]: ARBITRUM_SEPOLIA,

  // Stubs
  [ARBITRUM]: ARBITRUM,
  [AVALANCHE]: AVALANCHE,
  [AVALANCHE_FUJI]: AVALANCHE_FUJI,
};

export function getMultichainTokenId(chainId: number, tokenAddress: string): MultichainTokenId | undefined {
  return CHAIN_ID_TO_TOKEN_ID_MAP[chainId]?.[tokenAddress];
}

export function getStargatePoolAddress(chainId: number, tokenAddress: string): Address | undefined {
  const tokenId = getMultichainTokenId(chainId, tokenAddress);

  if (!tokenId) return undefined;

  return tokenId.stargate;
}

export function getStargateEndpointId(chainId: number): EndpointId | undefined {
  return CHAIN_ID_TO_ENDPOINT_ID[chainId];
}

export function getMappedTokenId(
  fromChainId: UiSettlementChain | UiSourceChain,
  fromChainTokenAddress: string,
  toChainId: UiSettlementChain | UiSourceChain
): MultichainTokenId | undefined {
  const tokenId = getMultichainTokenId(fromChainId, fromChainTokenAddress);

  if (!tokenId) return undefined;

  const symbol = tokenId.symbol;

  const mappedTokenId = TOKEN_GROUPS[symbol]?.[toChainId];

  return mappedTokenId;
}

export const MULTICALLS_MAP: Record<UiSourceChain, Address> = {
  [OPTIMISM_SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
  [SEPOLIA]: "0xca11bde05977b3631167028862be2a173976ca11",
};

if (isDevelopment() && DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT) {
  MULTICALLS_MAP[ARBITRUM_SEPOLIA as UiSourceChain] = "0xca11bde05977b3631167028862be2a173976ca11";
}
