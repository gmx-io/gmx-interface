import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { SettlementChainId } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { usePrivyWalletLoader } from "context/PrivyWalletContext/PrivyWalletLoaderContext";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";

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
  setConnectModalSuccessHandler: (handler: (() => void) | undefined) => void;
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
  setConnectModalSuccessHandler: () => undefined,
});

function shouldKeepAppSelectedSourceChain(settlementChainId: SettlementChainId) {
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const selectedNetworkWasAppSelected =
    localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true";

  return selectedNetworkWasAppSelected && isSourceChain(chainIdFromLocalStorage, settlementChainId);
}

export function ConnectModalProvider({ children }: { children: React.ReactNode }) {
  const connectModalSuccessHandlerRef = useRef<(() => void) | undefined>(undefined);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [isConnectRequestPending, setIsConnectRequestPending] = useState(false);
  const [connectRequestId, setConnectRequestId] = useState(0);
  const { isPrivyWalletInitializing, isPrivyWalletReady, loadPrivyWalletProvider } = usePrivyWalletLoader();

  const setConnectModalSuccessHandler = useCallback((handler: (() => void) | undefined) => {
    connectModalSuccessHandlerRef.current = handler;
  }, []);

  const handleConnectModalSuccess = useCallback(() => {
    setConnectModalOpen(false);
    setIsConnectRequestPending(false);
    connectModalSuccessHandlerRef.current?.();
  }, []);

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
      setConnectModalSuccessHandler,
    }),
    [connectRequestId, handleConnectModalError, handleConnectModalSuccess, setConnectModalSuccessHandler]
  );

  return (
    <ConnectModalContext.Provider value={value}>
      <ConnectModalControllerContext.Provider value={controllerValue}>
        {children}
      </ConnectModalControllerContext.Provider>
    </ConnectModalContext.Provider>
  );
}

export function ConnectModalSettlementChainBridge() {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { setConnectModalSuccessHandler } = useConnectModalController();

  useEffect(() => {
    setConnectModalSuccessHandler(() => {
      if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
        return;
      }

      void switchNetwork(settlementChainId, true).catch((error) => {
        metrics.pushError(error, "connectModal.switchNetwork");
      });
    });

    return () => setConnectModalSuccessHandler(undefined);
  }, [setConnectModalSuccessHandler, settlementChainId]);

  return null;
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
