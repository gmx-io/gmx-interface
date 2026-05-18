import { useWallets } from "@privy-io/react-auth";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { isAddressEqual } from "viem";

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
  const { active: isConnected, account } = useWallet();
  const { chainId: settlementChainId, isConnectedToChainId, srcChainId } = useDisplayedChainId();

  const { ready, wallets } = useWallets();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  const showToastTimeout = useRef<NodeJS.Timeout | null>(null);

  const suspiciousWallets = useMemo(() => {
    if (!ready) {
      return [];
    }

    const chainIds = new Set<number>();
    const suitableWallets = wallets.filter((wallet) => {
      return wallet.type === "ethereum" && account && isAddressEqual(wallet.address, account);
    });

    for (const wallet of suitableWallets) {
      const chainId = Number(wallet.chainId.split(":")[1]);
      chainIds.add(chainId);
    }

    if (chainIds.size > 1) {
      return suitableWallets;
    }

    return [];
  }, [account, ready, wallets]);

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
