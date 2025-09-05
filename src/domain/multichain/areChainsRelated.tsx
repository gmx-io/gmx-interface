import type { SettlementChainId, SourceChainId } from "config/chains";
import { MULTICHAIN_TOKEN_MAPPING } from "config/multichain";

export function areChainsRelated(settlementChainId: SettlementChainId, sourceChainId: SourceChainId) {
  return Object.keys(MULTICHAIN_TOKEN_MAPPING[settlementChainId]?.[sourceChainId] || {}).length > 0;
}
