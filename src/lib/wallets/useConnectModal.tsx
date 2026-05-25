import { createContext, useCallback, useContext, useMemo, useState } from "react";

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
});

export function ConnectModalProvider({ children }: { children: React.ReactNode }) {
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [isConnectRequestPending, setIsConnectRequestPending] = useState(false);
  const [connectRequestId, setConnectRequestId] = useState(0);
  const { loadPrivyWalletProvider, isPrivyWalletInitializing, isPrivyWalletReady } = usePrivyWalletLoader();

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
    () => ({ connectRequestId, setConnectModalOpen, setConnectRequestPending: setIsConnectRequestPending }),
    [connectRequestId]
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
