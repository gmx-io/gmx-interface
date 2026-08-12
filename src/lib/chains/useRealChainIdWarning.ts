import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";

import { useChainId as useDisplayedChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { useWalletUnavailableChains } from "lib/wallets/useWalletSessionChains";

import {
  INVALID_NETWORK_TOAST_ID,
  getInvalidNetworkToastContent,
  getSmartWalletChainUnavailableToastContent,
} from "components/Errors/errorToasts";
import { needSwitchToSettlementChain } from "components/SwitchToSettlementChain/utils";

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
  const { chainId: settlementChainId, isConnectedToChainId, srcChainId } = useDisplayedChainId();
  const { chainId: walletChainId } = useAccount();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  const { unavailableChains, isLoading: isLoadingAvailability } = useWalletUnavailableChains([settlementChainId]);

  const isOnSourceChain = needSwitchToSettlementChain(walletChainId);
  const isSettlementChainUnreachable = isOnSourceChain && Boolean(unavailableChains?.includes(settlementChainId));

  const isVerdictPending = isOnSourceChain && isLoadingAvailability;

  const showToastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isConnectedToChainId && !isActive && isConnected && !isVerdictPending) {
      const timeout = setTimeout(
        () =>
          toast.error(
            isSettlementChainUnreachable
              ? getSmartWalletChainUnavailableToastContent(settlementChainId)
              : getInvalidNetworkToastContent(srcChainId ?? settlementChainId),
            {
              toastId: INVALID_NETWORK_TOAST_ID,
              autoClose: false,
              closeButton: false,
            }
          ),
        2000
      );
      showToastTimeout.current = timeout;
    } else if (isConnectedToChainId || !isConnected) {
      if (showToastTimeout.current) {
        clearTimeout(showToastTimeout.current);
      }
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    }
  }, [
    settlementChainId,
    isActive,
    isConnected,
    isConnectedToChainId,
    srcChainId,
    isSettlementChainUnreachable,
    isVerdictPending,
  ]);

  useEffect(() => {
    return () => {
      if (showToastTimeout.current) {
        clearTimeout(showToastTimeout.current);
      }
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    };
  }, []);
}
