import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BASE_MAINNET, SONIC_MAINNET } from "config/chains";
import { isDevelopment } from "config/env";

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
  // USDC - testnets
  [
    {
      chainId: ARBITRUM_SEPOLIA,
      address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      decimals: 6,
    },
    {
      chainId: AVALANCHE_FUJI,
      // Technically different from offical USDC on Avalanche Fuji
      address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
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
    {
      chainId: AVALANCHE_FUJI,
      address: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
      decimals: 18,
    },
  ],
];

const SETTLEMENT_CHAINS = isDevelopment() ? [ARBITRUM, AVALANCHE] : [ARBITRUM, AVALANCHE, ARBITRUM_SEPOLIA];

export function isSettlementChain(chainId: number) {
  return SETTLEMENT_CHAINS.includes(chainId);
}

export const MULTI_CHAIN_TOKEN_MAPPING: MultichainTokenMapping = {};

export const MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS: MultichainDepositSupportedTokens = {};

export const MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS: MultichainWithdrawSupportedTokens = {};

for (const tokenGroup of TOKEN_GROUPS) {
  for (const settlementToken of tokenGroup) {
    if (!SETTLEMENT_CHAINS.includes(settlementToken.chainId)) continue;

    let empty = true;
    for (const sourceToken of tokenGroup) {
      if (settlementToken.chainId === sourceToken.chainId) continue;
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
