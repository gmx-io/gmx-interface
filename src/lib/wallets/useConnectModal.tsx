import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { SettlementChainId } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";

import { usePrivyWalletLoader } from "./privyWalletLoader";

type ConnectModalContextValue = {
  openConnectModal: (() => void) | undefined;
  connectModalOpen: boolean;
  isConnectModalLoading: boolean;
};

type ConnectModalControllerContextValue = {
  connectRequestId: number;
  setConnectModalOpen: (value: boolean) => void;
  setConnectRequestPending: (value: boolean) => void;
  onConnectModalSuccess: () => void;
  onConnectModalError: () => void;
};

const ConnectModalContext = createContext<ConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
  isConnectModalLoading: false,
});

const ConnectModalControllerContext = createContext<ConnectModalControllerContextValue>({
  connectRequestId: 0,
  setConnectModalOpen: () => undefined,
  setConnectRequestPending: () => undefined,
  onConnectModalSuccess: () => undefined,
  onConnectModalError: () => undefined,
});

function shouldKeepAppSelectedSourceChain(settlementChainId: SettlementChainId) {
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const selectedNetworkWasAppSelected =
    localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true";

  return selectedNetworkWasAppSelected && isSourceChain(chainIdFromLocalStorage, settlementChainId);
}

export function ConnectModalProvider({ children }: { children: React.ReactNode }) {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [isConnectRequestPending, setIsConnectRequestPending] = useState(false);
  const [connectRequestId, setConnectRequestId] = useState(0);
  const { loadPrivyWalletProvider, isPrivyWalletInitializing, isPrivyWalletReady } = usePrivyWalletLoader();

  const handleConnectModalSuccess = useCallback(() => {
    setConnectModalOpen(false);
    setIsConnectRequestPending(false);

    if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
      return;
    }

    void switchNetwork(settlementChainId, true).catch((error) => {
      metrics.pushError(error, "connectModal.switchNetwork");
    });
  }, [settlementChainId]);

  const handleConnectModalError = useCallback(() => {
    setConnectModalOpen(false);
    setIsConnectRequestPending(false);
  }, []);

  const openConnectModal = useCallback(() => {
    setConnectModalOpen(isPrivyWalletReady);
    setIsConnectRequestPending(!isPrivyWalletReady);
    setConnectRequestId((currentRequestId) => currentRequestId + 1);
    loadPrivyWalletProvider();
  }, [isPrivyWalletReady, loadPrivyWalletProvider]);

  const isConnectModalLoading = isPrivyWalletInitializing || isConnectRequestPending;

  const value = useMemo(
    () => ({ openConnectModal, connectModalOpen, isConnectModalLoading }),
    [connectModalOpen, isConnectModalLoading, openConnectModal]
  );

  const controllerValue = useMemo(
    () => ({
      connectRequestId,
      setConnectModalOpen,
      setConnectRequestPending: setIsConnectRequestPending,
      onConnectModalSuccess: handleConnectModalSuccess,
      onConnectModalError: handleConnectModalError,
    }),
    [connectRequestId, handleConnectModalError, handleConnectModalSuccess]
  );

  return (
    <ConnectModalContext.Provider value={value}>
      <ConnectModalControllerContext.Provider value={controllerValue}>
        {children}
      </ConnectModalControllerContext.Provider>
    </ConnectModalContext.Provider>
  );
}

/**
 * Drop-in replacement for RainbowKit's useConnectModal.
 * Returns { openConnectModal, connectModalOpen } with the same interface.
 */
export function useConnectModal() {
  return useContext(ConnectModalContext);
}

export function useConnectModalController() {
  return useContext(ConnectModalControllerContext);
}
