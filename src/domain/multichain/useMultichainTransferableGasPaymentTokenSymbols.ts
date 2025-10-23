import { isSettlementChain } from "config/multichain";
import { useChainId } from "lib/chains";
import { EMPTY_ARRAY } from "lib/objects";

import { getMultichainTransferableGasPaymentTokenSymbols } from "./getMultichainTransferableGasPaymentTokenAddresses";

export function useMultichainTransferableGasPaymentTokenSymbols() {
  const { chainId, srcChainId } = useChainId();

  if (!srcChainId || !isSettlementChain(chainId)) {
    return EMPTY_ARRAY;
  }

  return getMultichainTransferableGasPaymentTokenSymbols(chainId, srcChainId);
}
