import { useWallets } from "@privy-io/react-auth";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { toast } from "react-toastify";

import { useChainId as useDisplayedChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

import {
  INVALID_NETWORK_TOAST_ID,
  getInvalidNetworkToastContent,
  getMultipleWalletsConnectedToastContent,
} from "components/Errors/errorToasts";

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

  const { ready, wallets } = useWallets();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  const showToastTimeout = useRef<NodeJS.Timeout | null>(null);

  const suspiciousWallets = useMemo(() => {
    if (!ready) {
      return [];
    }
    return wallets.filter((wallet) => {
      return wallet.type === "ethereum" && Number(wallet.chainId.split(":")[1]) !== (srcChainId ?? settlementChainId);
    });
  }, [ready, wallets, srcChainId, settlementChainId]);

  useEffect(() => {
    if (suspiciousWallets.length > 0) {
      const timeout = setTimeout(
        () =>
          helperToast.info(
            getMultipleWalletsConnectedToastContent(
              suspiciousWallets.map((wallet) => ({
                chainId: Number(wallet.chainId.split(":")[1]),
                walletName: wallet.meta.name ?? wallet.walletClientType,
              })),
              srcChainId ?? settlementChainId
            ),
            {
              toastId: INVALID_NETWORK_TOAST_ID,
              autoClose: false,
              closeButton: false,
              updateId: suspiciousWallets.length,
            }
          ),
        2000
      );
      showToastTimeout.current = timeout;
    } else if (!isConnectedToChainId && !isActive && isConnected) {
      const timeout = setTimeout(
        () =>
          toast.error(getInvalidNetworkToastContent(srcChainId ?? settlementChainId), {
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
  }, [settlementChainId, isActive, isConnected, isConnectedToChainId, srcChainId, suspiciousWallets]);

  useEffect(() => {
    return () => {
      if (showToastTimeout.current) {
        clearTimeout(showToastTimeout.current);
      }
      toast.dismiss(INVALID_NETWORK_TOAST_ID);
    };
  }, []);
}
