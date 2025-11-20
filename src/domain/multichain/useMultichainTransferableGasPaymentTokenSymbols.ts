import { isSettlementChain } from "config/multichain";
import { useChainId } from "lib/chains";
import { EMPTY_ARRAY } from "lib/objects";

import { areChainsRelated } from "./areChainsRelated";
import { getMultichainTransferableGasPaymentTokenSymbols } from "./getMultichainTransferableGasPaymentTokenAddresses";

export function useMultichainTransferableGasPaymentTokenSymbols() {
  const { chainId, srcChainId } = useChainId();

  if (!srcChainId || !isSettlementChain(chainId) || !areChainsRelated(chainId, srcChainId)) {
    return EMPTY_ARRAY;
  }

  return getMultichainTransferableGasPaymentTokenSymbols(chainId, srcChainId);
}
