import { errors as _StargateErrorsAbi } from "@stargatefinance/stg-evm-sdk-v2";
import invert from "lodash/invert";
import mapValues from "lodash/mapValues";
import type { Abi } from "viem";
import { maxUint256 } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  MEGAETH,
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
import { numberToBigint } from "lib/numbers";
import { ISigner } from "lib/transactions/iSigner";
import { getContract } from "sdk/configs/contracts";
import { CHAIN_ID_TO_ENDPOINT_ID, isSettlementChain, isSourceChain, LayerZeroEndpointId } from "sdk/configs/multichain";
import {
  getMultichainTokenGroups,
  MultichainTokenGroups,
  MultichainTokenId,
} from "sdk/configs/multichainTokens";
import { convertTokenAddress, getTokenBySymbol } from "sdk/configs/tokens";

export * from "sdk/configs/multichain";
export type { MultichainTokenId } from "sdk/configs/multichainTokens";

export type MultichainTokenMapping = Record<
  SettlementChainId,
  Record<
    SourceChainId,
    Record<
      string,
      {
        settlementChainTokenAddress: string;
        sourceChainTokenAddress: string;
        sourceChainTokenDecimals: number;
      }
    >
  >
>;

export const SETTLEMENT_CHAINS: SettlementChainId[] = isDevelopment()
  ? (SETTLEMENT_CHAIN_IDS_DEV as unknown as SettlementChainId[])
  : (SETTLEMENT_CHAIN_IDS as unknown as SettlementChainId[]);

const TOKEN_GROUPS: MultichainTokenGroups = getMultichainTokenGroups({ includeTestnets: isDevelopment() });

export const MULTI_CHAIN_TOKEN_MAPPING = {} as MultichainTokenMapping;
export const MULTI_CHAIN_DEPOSIT_TRADE_TOKENS = {} as Record<SettlementChainId, string[]>;
export const MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS = {} as Record<SettlementChainId, string[]>;
export const MULTI_CHAIN_PLATFORM_TOKENS_MAP = {} as Record<SettlementChainId, string[]>;
export const CHAIN_ID_TO_TOKEN_ID_MAP = {} as Partial<Record<AnyChainId, Record<string, MultichainTokenId>>>;
export const MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING = {} as Record<SourceChainId, SettlementChainId[]>;

function pushUnique<K extends string | number, V>(map: Record<K, V[]>, key: K, value: V): void {
  const list = map[key] || (map[key] = []);
  if (!list.includes(value)) list.push(value);
}

for (const byChain of Object.values(TOKEN_GROUPS)) {
  if (!byChain) continue;

  for (const token of Object.values(byChain)) {
    if (!token) continue;
    const tokenChainId = token.chainId as AnyChainId;
    const chainTokens =
      CHAIN_ID_TO_TOKEN_ID_MAP[tokenChainId] || (CHAIN_ID_TO_TOKEN_ID_MAP[tokenChainId] = {});
    chainTokens[token.address] = token;

    if (!isSettlementChain(token.chainId)) continue;
    const settlementChainId = token.chainId as SettlementChainId;

    if (token.isPlatformToken) {
      pushUnique(MULTI_CHAIN_PLATFORM_TOKENS_MAP, settlementChainId, token.address);
    } else {
      pushUnique(MULTI_CHAIN_DEPOSIT_TRADE_TOKENS, settlementChainId, token.address);
      pushUnique(
        MULTI_CHAIN_WITHDRAWAL_TRADE_TOKENS,
        settlementChainId,
        convertTokenAddress(settlementChainId, token.address, "wrapped")
      );
    }

    for (const sourceToken of Object.values(byChain)) {
      if (!sourceToken) continue;
      const sourceChainId = sourceToken.chainId as SourceChainId;
      if (sourceChainId === (settlementChainId as number)) continue;
      if (!isSourceChain(sourceChainId, settlementChainId)) continue;
      if (Boolean(token.isTestnet) !== Boolean(sourceToken.isTestnet)) continue;

      pushUnique(MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING, sourceChainId, settlementChainId);

      const bySettlement =
        MULTI_CHAIN_TOKEN_MAPPING[settlementChainId] ||
        (MULTI_CHAIN_TOKEN_MAPPING[settlementChainId] = {} as MultichainTokenMapping[SettlementChainId]);
      const bySource = bySettlement[sourceChainId] || (bySettlement[sourceChainId] = {});
      bySource[sourceToken.address] = {
        settlementChainTokenAddress: token.address,
        sourceChainTokenAddress: sourceToken.address,
        sourceChainTokenDecimals: sourceToken.decimals,
      };
    }
  }
}

export function getMultichainTokenId(chainId: number, tokenAddress: string): MultichainTokenId | undefined {
  return CHAIN_ID_TO_TOKEN_ID_MAP[chainId as AnyChainId]?.[tokenAddress];
}

export function getStargatePoolAddress(chainId: number, tokenAddress: string): string | undefined {
  return getMultichainTokenId(chainId, tokenAddress)?.stargate;
}

export function getMappedTokenId(
  fromChainId: SettlementChainId | SourceChainId,
  fromChainTokenAddress: string,
  toChainId: SettlementChainId | SourceChainId
): MultichainTokenId | undefined {
  const tokenId = getMultichainTokenId(fromChainId, fromChainTokenAddress);
  if (!tokenId) return undefined;
  return TOKEN_GROUPS[tokenId.symbol]?.[toChainId];
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
  const tokenId = getMappedTokenId(chainId as SettlementChainId, tokenAddress, srcChainId);
  return tokenId?.decimals;
}

