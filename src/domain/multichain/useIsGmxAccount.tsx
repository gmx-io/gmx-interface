import noop from "lodash/noop";

import { ContractsChainId, SourceChainId } from "config/chains";
import { isSettlementChain } from "config/multichain";

export function useIsGmxAccount({
  chainId,
  srcChainId,
  storedIsGmxAccount,
  setStoredIsGmxAccount,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  storedIsGmxAccount: boolean | undefined;
  setStoredIsGmxAccount: (isGmxAccount: boolean) => void;
}): [boolean, (isGmxAccount: boolean) => void] {
  let isGmxAccount = false;
  if (srcChainId !== undefined) {
    isGmxAccount = true;
  } else if (!isSettlementChain(chainId)) {
    isGmxAccount = false;
  } else {
    isGmxAccount = Boolean(storedIsGmxAccount);
  }

  let setIsGmxAccount: (value: boolean) => void;
  if (srcChainId !== undefined) {
    setIsGmxAccount = noop;
  } else if (!isSettlementChain(chainId)) {
    setIsGmxAccount = noop;
  } else {
    setIsGmxAccount = setStoredIsGmxAccount;
  }

  return [isGmxAccount, setIsGmxAccount];
}
