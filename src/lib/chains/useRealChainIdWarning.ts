import { useEffect, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";

import { useChainId as useDisplayedChainId } from "lib/chains";
import { INVALID_NETWORK_TOAST_ID, getInvalidNetworkErrorMessage } from "lib/contracts/transactionErrors";

const toastSubscribe = (onStoreChange: () => void): (() => void) => {
  const cleanup = toast.onChange(({ id }) => {
    if (id === INVALID_NETWORK_TOAST_ID) {
      onStoreChange();
    }
  });

  return cleanup;
};

const toastGetSnapshot = () => toast.isActive(INVALID_NETWORK_TOAST_ID);

export function useRealChainIdWarning() {
  const { isConnected } = useAccount();
  const { chainId: displayedChainId, isConnectedToChainId } = useDisplayedChainId();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  useEffect(() => {
    if (!isConnectedToChainId && !isActive && isConnected) {
      toast.error(getInvalidNetworkErrorMessage(displayedChainId), {
        toastId: INVALID_NETWORK_TOAST_ID,
        autoClose: false,
        closeButton: false,
      });
    } else if ((isConnectedToChainId || !isConnected) && isActive) {
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    }
  }, [displayedChainId, isActive, isConnected, isConnectedToChainId]);

  useEffect(() => {
    return () => {
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    };
  }, []);
}
