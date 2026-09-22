import {
  type AnyChainId,
  type ContractsChainId,
  type SettlementChainId,
  type SourceChainId,
  CONTRACTS_CHAIN_IDS,
  DEFAULT_SETTLEMENT_CHAIN_ID_MAP,
} from "config/chains";
import { MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING } from "config/multichain";

export function getChainIdFromSearchParam(value: string | undefined): AnyChainId | undefined {
  const chainId = Number(value);

  if (!value || !Number.isSafeInteger(chainId)) {
    return undefined;
  }

  if (CONTRACTS_CHAIN_IDS.includes(chainId as ContractsChainId)) {
    return chainId as ContractsChainId;
  }

  if (MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[chainId as SourceChainId]?.length) {
    return chainId as SourceChainId;
  }

  return undefined;
}

export function getSettlementChainIdForSelectedChain(
  chainId: AnyChainId,
  currentSettlementChainId: SettlementChainId
): SettlementChainId {
  const settlementChainIds = MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[chainId as SourceChainId];

  if (!settlementChainIds?.length || settlementChainIds.includes(currentSettlementChainId)) {
    return currentSettlementChainId;
  }

  const defaultSettlementChainId = DEFAULT_SETTLEMENT_CHAIN_ID_MAP[chainId];

  return settlementChainIds.includes(defaultSettlementChainId) ? defaultSettlementChainId : settlementChainIds[0];
}
