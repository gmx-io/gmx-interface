import { EndpointId } from "@layerzerolabs/lz-definitions";
import uniq from "lodash/uniq";
import { Address, Hex, zeroAddress } from "viem";

import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  OPTIMISM_SEPOLIA,
  SEPOLIA,
  UiContractsChain,
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
  UiSettlementChain,
  Record<
    // source chain id
    UiSourceChain,
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
  UiSettlementChain,
  MultichainTokenId[]
>;

type MultichainSupportedTokenMap = Record<
  // settlement chain id
  UiSettlementChain,
  Record<
    // source chain id
    UiSourceChain,
    // source chain token address
    string[]
  >
>;

type MultichainWithdrawSupportedTokens = Record<
  // settlement chain id
  UiSettlementChain,
  // settlement chain token address
  string[]
>;

type MultichainSourceToSettlementChainMapping = Record<UiSourceChain, UiSettlementChain[]>;

export type MultichainTokenId = {
  chainId: UiSettlementChain | UiSourceChain;
  address: string;
  decimals: number;
  stargate: Address;
  symbol: string;
};

export const TOKEN_GROUPS: Partial<
  Record<string, Partial<Record<UiSourceChain | UiSettlementChain, MultichainTokenId>>>
> = {};
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

  // TOKEN_GROUPS["WETH"] = {
  //   [ARBITRUM_SEPOLIA]: {
  //     address: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
  //     decimals: 18,
  //     chainId: ARBITRUM_SEPOLIA,
  //     stargate: ethPoolArbitrumSepolia as Address,
  //     symbol: "WETH",
  //   },
  // };
}

export const DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT = true;

export const CONTRACTS_CHAINS: UiContractsChain[] = Object.keys({
  [ARBITRUM_SEPOLIA]: true,
  [ARBITRUM]: true,
  [AVALANCHE]: true,
  [AVALANCHE_FUJI]: true,
} satisfies Record<UiContractsChain, true>).map(Number) as UiContractsChain[];

export const SETTLEMENT_CHAINS: UiSettlementChain[] = Object.keys({
  [ARBITRUM_SEPOLIA]: true,
} satisfies Record<UiSettlementChain, true>).map(Number) as UiSettlementChain[];

// To test bridge in from the same network add ARBITRUM_SEPOLIA to source chains
export const SOURCE_CHAINS: UiSourceChain[] = Object.keys({
  [OPTIMISM_SEPOLIA]: true,
  [SEPOLIA]: true,
} satisfies Record<UiSourceChain, true>).map(Number) as UiSourceChain[];

if (isDevelopment() && DEBUG_MULTICHAIN_SAME_CHAIN_DEPOSIT) {
  SOURCE_CHAINS.push(ARBITRUM_SEPOLIA as UiSourceChain);
}

export function isContractsChain(chainId: number): chainId is UiContractsChain {
  return CONTRACTS_CHAINS.includes(chainId as UiContractsChain);
}

export function isSettlementChain(chainId: number): chainId is UiSettlementChain {
  return SETTLEMENT_CHAINS.includes(chainId as UiSettlementChain);
}

export function isSourceChain(chainId: number): chainId is UiSourceChain {
  return SOURCE_CHAINS.includes(chainId as UiSourceChain);
}

export const MULTI_CHAIN_TOKEN_MAPPING = {} as MultichainTokenMapping;

export const MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS = {} as MultichainDepositSupportedTokens;
export const MULTI_CHAIN_SUPPORTED_TOKEN_MAP = {} as MultichainSupportedTokenMap;

export const MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS = {} as MultichainWithdrawSupportedTokens;

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
  // TODO: fix
  // [BASE_MAINNET]: ARBITRUM_SEPOLIA, // ARBITRUM,
  // [SONIC_MAINNET]: ARBITRUM_SEPOLIA, // ARBITRUM,

  [ARBITRUM_SEPOLIA]: ARBITRUM_SEPOLIA,
  [OPTIMISM_SEPOLIA]: ARBITRUM_SEPOLIA,
  [SEPOLIA]: ARBITRUM_SEPOLIA,

  // Stubs
  // TODO: fix
  [ARBITRUM]: ARBITRUM_SEPOLIA, // ARBITRUM,
  [AVALANCHE]: ARBITRUM_SEPOLIA, // AVALANCHE,
  [AVALANCHE_FUJI]: ARBITRUM_SEPOLIA, // AVALANCHE_FUJI,
};

export function getMultichainTokenId(chainId: number, tokenAddress: string): MultichainTokenId | undefined {
  return CHAIN_ID_TO_TOKEN_ID_MAP[chainId]?.[tokenAddress];
}

export function getStargatePoolAddress(chainId: number, tokenAddress: string): Address | undefined {
  const tokenId = getMultichainTokenId(chainId, tokenAddress);

  if (!tokenId) return undefined;

  return tokenId.stargate;
}

export function getLayerZeroEndpointId(chainId: number): EndpointId | undefined {
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

export const OVERRIDE_ERC20_BYTECODE: Hex =
  "0x608060405234801561001057600080fd5b50600436106100835760003560e01c806306fdde0314610088578063095ea7b3146100ca57806318160ddd146100ed57806323b872dd14610103578063313ce5671461011657806370a082311461012557806395d89b4114610138578063a9059cbb14610157578063dd62ed3e1461016a575b600080fd5b60408051808201909152601481527326b7b1b5902ab73634b6b4ba32b2102a37b5b2b760611b60208201525b6040516100c191906103ae565b60405180910390f35b6100dd6100d8366004610418565b61017d565b60405190151581526020016100c1565b6100f56101ea565b6040519081526020016100c1565b6100dd610111366004610442565b6101fe565b604051601281526020016100c1565b6100f561013336600461047e565b6102c6565b60408051808201909152600381526213555560ea1b60208201526100b4565b6100dd610165366004610418565b6102fa565b6100f5610178366004610499565b610374565b3360008181526001602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906101d89086815260200190565b60405180910390a35060015b92915050565b60006101f960026000196104e2565b905090565b60008161020b8533610374565b6102159190610504565b6001600160a01b038516600090815260016020908152604080832033845290915290205581610243856102c6565b61024d9190610504565b6001600160a01b03851660009081526020819052604090205581610270846102c6565b61027a9190610517565b6001600160a01b0384811660008181526020818152604091829020949094555185815290929187169160008051602061052b833981519152910160405180910390a35060019392505050565b6001600160a01b0381166000908152602081905260408120548082036101e4576102f360026000196104e2565b9392505050565b600081610306336102c6565b6103109190610504565b33600081815260208190526040902091909155829061032e906102c6565b6103389190610517565b6001600160a01b0384166000818152602081815260409182902093909355518481529091339160008051602061052b83398151915291016101d8565b6001600160a01b0380831660009081526001602090815260408083209385168352929052908120548082036102f3576000199150506101e4565b600060208083528351808285015260005b818110156103db578581018301518582016040015282016103bf565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461041357600080fd5b919050565b6000806040838503121561042b57600080fd5b610434836103fc565b946020939093013593505050565b60008060006060848603121561045757600080fd5b610460846103fc565b925061046e602085016103fc565b9150604084013590509250925092565b60006020828403121561049057600080fd5b6102f3826103fc565b600080604083850312156104ac57600080fd5b6104b5836103fc565b91506104c3602084016103fc565b90509250929050565b634e487b7160e01b600052601160045260246000fd5b6000826104ff57634e487b7160e01b600052601260045260246000fd5b500490565b818103818111156101e4576101e46104cc565b808201808211156101e4576101e46104cc56feddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa2646970667358221220aa82e9605a01c10c7889cf6596bfde251ec3112e04b47e947ce9abd7e144de0964736f6c63430008120033";

export const CHAIN_ID_PREFERRED_DEPOSIT_TOKEN: Record<UiSettlementChain, string> = {
  [ARBITRUM_SEPOLIA]: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
};
