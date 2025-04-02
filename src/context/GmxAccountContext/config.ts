import uniq from "lodash/uniq";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BASE_MAINNET, SONIC_MAINNET } from "config/chains";
import { isDevelopment } from "config/env";
import { zeroAddress } from "viem";

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
  // source chain id
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

type MultichainTokenId = {
  chainId: number;
  address: string;
  decimals: number;
};

type MultichainTokenGroup = MultichainTokenId[];

const TOKEN_GROUPS: MultichainTokenGroup[] = [
  // USDC - prod
  [
    {
      chainId: ARBITRUM,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
    },
    {
      chainId: AVALANCHE,
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
    },
    {
      chainId: BASE_MAINNET,
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
    },
    {
      chainId: SONIC_MAINNET,
      // Technically this is USDC.e
      address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
      decimals: 6,
    },
  ],
  // WETH - prod
  [
    {
      chainId: ARBITRUM,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      decimals: 18,
    },
    {
      chainId: AVALANCHE,
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      decimals: 18,
    },
    {
      chainId: BASE_MAINNET,
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    {
      chainId: SONIC_MAINNET,
      address: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
      decimals: 18,
    },
  ],
  // BTC - prod
  [
    {
      chainId: ARBITRUM,
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      decimals: 8,
    },
    {
      chainId: AVALANCHE,
      address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      decimals: 8,
    },
    {
      chainId: BASE_MAINNET,
      address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
      decimals: 8,
    },
    {
      chainId: SONIC_MAINNET,
      address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
      decimals: 8,
    },
  ],
];

if (isDevelopment()) {
  TOKEN_GROUPS.push(
    // USDC - testnets
    [
      {
        chainId: ARBITRUM_SEPOLIA,
        address: "0x3321Fd36aEaB0d5CdfD26f4A3A93E2D2aAcCB99f",
        decimals: 6,
      },
    ],
    // WETH - testnets
    [
      {
        chainId: ARBITRUM_SEPOLIA,
        address: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
        decimals: 18,
      },
    ],
    // BTC - testnets
    [
      {
        chainId: ARBITRUM_SEPOLIA,
        address: "0xF79cE1Cf38A09D572b021B4C5548b75A14082F12",
        decimals: 8,
      },
    ],
    // Native currecncies separately
    [
      {
        chainId: ARBITRUM_SEPOLIA,
        address: zeroAddress,
        decimals: 18,
      },
    ]
  );
}

export const SETTLEMENT_CHAINS = !isDevelopment() ? [ARBITRUM, AVALANCHE] : [ARBITRUM, AVALANCHE, ARBITRUM_SEPOLIA];

export const SOURCE_CHAINS = !isDevelopment()
  ? [BASE_MAINNET, SONIC_MAINNET, ARBITRUM, AVALANCHE]
  : [BASE_MAINNET, SONIC_MAINNET, ARBITRUM, AVALANCHE, ARBITRUM_SEPOLIA];

export function isSettlementChain(chainId: number) {
  return SETTLEMENT_CHAINS.includes(chainId);
}

export function isSourceChain(chainId: number) {
  return SOURCE_CHAINS.includes(chainId);
}

export const MULTI_CHAIN_TOKEN_MAPPING: MultichainTokenMapping = {};

export const MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS: MultichainDepositSupportedTokens = {};
export const MULTI_CHAIN_SUPPORTED_TOKEN_MAP: MultichainSupportedTokenMap = {};

export const MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS: MultichainWithdrawSupportedTokens = {};

for (const tokenGroup of TOKEN_GROUPS) {
  for (const settlementToken of tokenGroup) {
    if (!SETTLEMENT_CHAINS.includes(settlementToken.chainId)) continue;

    let empty = true;
    for (const sourceToken of tokenGroup) {
      if (!isDevelopment() && settlementToken.chainId === sourceToken.chainId) continue;
      empty = false;

      MULTI_CHAIN_TOKEN_MAPPING[settlementToken.chainId] = MULTI_CHAIN_TOKEN_MAPPING[settlementToken.chainId] || {};
      MULTI_CHAIN_TOKEN_MAPPING[settlementToken.chainId][sourceToken.chainId] =
        MULTI_CHAIN_TOKEN_MAPPING[settlementToken.chainId][sourceToken.chainId] || {};

      MULTI_CHAIN_TOKEN_MAPPING[settlementToken.chainId][sourceToken.chainId][sourceToken.address] = {
        settlementChainTokenAddress: settlementToken.address,
        sourceChainTokenAddress: sourceToken.address,
        sourceChainTokenDecimals: sourceToken.decimals,
      };

      MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementToken.chainId] =
        MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementToken.chainId] || [];
      MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementToken.chainId].push(sourceToken);
    }

    if (!empty) {
      MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementToken.chainId] =
        MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementToken.chainId] || [];
      MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementToken.chainId].push(settlementToken.address);
    }
  }
}

for (const tokenGroup of TOKEN_GROUPS) {
  for (const firstTokenId of tokenGroup) {
    for (const secondTokenId of tokenGroup) {
      if (!isDevelopment() && firstTokenId.chainId === secondTokenId.chainId) continue;

      if (isSettlementChain(firstTokenId.chainId) && isSourceChain(secondTokenId.chainId)) {
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId] =
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId] || {};
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId][secondTokenId.chainId] =
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId][secondTokenId.chainId] || [];

        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId][secondTokenId.chainId].push(secondTokenId.address);
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId][secondTokenId.chainId] = uniq(
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[firstTokenId.chainId][secondTokenId.chainId]
        );
      }

      if (isSourceChain(firstTokenId.chainId) && isSettlementChain(secondTokenId.chainId)) {
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId] =
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId] || {};
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId][firstTokenId.chainId] =
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId][firstTokenId.chainId] || [];

        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId][firstTokenId.chainId].push(firstTokenId.address);
        MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId][firstTokenId.chainId] = uniq(
          MULTI_CHAIN_SUPPORTED_TOKEN_MAP[secondTokenId.chainId][firstTokenId.chainId]
        );
      }
    }
  }
}

export const DEFAULT_SETTLEMENT_CHAIN_ID_MAP = {
  [ARBITRUM]: ARBITRUM,
  [AVALANCHE]: AVALANCHE,
  [BASE_MAINNET]: ARBITRUM,
  [SONIC_MAINNET]: ARBITRUM,

  [AVALANCHE_FUJI]: ARBITRUM_SEPOLIA,
  [ARBITRUM_SEPOLIA]: ARBITRUM_SEPOLIA,
};
