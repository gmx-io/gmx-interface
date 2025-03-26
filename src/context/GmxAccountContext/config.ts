import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BASE_MAINNET, SONIC_MAINNET } from "config/chains";
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
  // USDC
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
  // WETH
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
  // BTC
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

const SETTLEMENT_CHAINS = isDevelopment() ? [ARBITRUM, AVALANCHE] : [ARBITRUM, AVALANCHE, AVALANCHE_FUJI];

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

console.log({ MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS });

// const CHAIN_TO_SUPPORTED_DEPOSIT_TOKENS: Record<number, string[]> = {
//   [ARBITRUM]: [
//     "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
//     "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
//     "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
//     "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
//     "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI
//   ],
//   [AVALANCHE]: [
//     "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
//     "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // WETH
//     "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
//     "0x50b7545627a5162F82A992c33b87aDc75187B218", // WBTC
//     "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT
//     "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", // DAI
//   ],
//   [BASE_MAINNET]: [
//     "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
//     "0x4200000000000000000000000000000000000006", // WETH
//     "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // WBTC
//     "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // USDT
//     "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
//   ],
//   [SONIC_MAINNET]: [
//     "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
//     "0x4200000000000000000000000000000000000006", // WETH
//     "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // WAVAX
//     "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // WBTC
//     "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // USDT
//     "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
//     "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // SOL
//   ],
// };
