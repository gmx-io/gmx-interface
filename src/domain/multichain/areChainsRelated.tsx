import type { SettlementChainId, SourceChainId } from "config/chains";
import { MULTI_CHAIN_TOKEN_MAPPING } from "config/multichain";

export function areChainsRelated(settlementChainId: SettlementChainId, sourceChainId: SourceChainId) {
  return Object.keys(MULTI_CHAIN_TOKEN_MAPPING[settlementChainId]?.[sourceChainId] || {}).length > 0;
}
