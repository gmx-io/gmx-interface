import { SourceChainId } from "config/chains";
import { isSourceChainForAnySettlementChain, isSettlementChain } from "config/multichain";

export function needSwitchToSettlementChain(walletChainId: number | undefined): walletChainId is SourceChainId {
  return Boolean(
    walletChainId && isSourceChainForAnySettlementChain(walletChainId) && !isSettlementChain(walletChainId)
  );
}
