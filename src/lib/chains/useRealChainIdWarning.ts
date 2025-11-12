import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "react-toastify";

import { useChainId as useDisplayedChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { INVALID_NETWORK_TOAST_ID, getInvalidNetworkToastContent } from "components/Errors/errorToasts";

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
  const { active: isConnected } = useWallet();
  const { chainId: displayedChainId, isConnectedToChainId } = useDisplayedChainId();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  const showToastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isConnectedToChainId && !isActive && isConnected) {
      const timeout = setTimeout(
        () =>
          toast.error(getInvalidNetworkToastContent(displayedChainId), {
            toastId: INVALID_NETWORK_TOAST_ID,
            autoClose: false,
            closeButton: false,
          }),
        2000
      );
      showToastTimeout.current = timeout;
    } else if (isConnectedToChainId || !isConnected) {
      if (showToastTimeout.current) {
        clearTimeout(showToastTimeout.current);
      }
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    }
  }, [displayedChainId, isActive, isConnected, isConnectedToChainId]);

  useEffect(() => {
    return () => {
      if (showToastTimeout.current) {
        clearTimeout(showToastTimeout.current);
      }
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    };
  }, []);
}
