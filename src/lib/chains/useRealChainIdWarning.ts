import { useEffect, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";

import { useChainId as useAssumedChainId } from "lib/chains";
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
  const { isConnected, chainId } = useAccount();
  const { chainId: assumedChainId } = useAssumedChainId();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  useEffect(() => {
    if (
      chainId !== undefined &&
      assumedChainId !== undefined &&
      chainId !== assumedChainId &&
      !isActive &&
      isConnected
    ) {
      toast.error(getInvalidNetworkErrorMessage(assumedChainId), {
        toastId: INVALID_NETWORK_TOAST_ID,
        autoClose: false,
        closeButton: false,
      });
    } else if (
      (chainId === assumedChainId || !isConnected || assumedChainId === undefined || chainId === undefined) &&
      isActive
    ) {
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    }
  }, [assumedChainId, chainId, isActive, isConnected]);

  useEffect(() => {
    return () => {
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    };
  }, []);
}
