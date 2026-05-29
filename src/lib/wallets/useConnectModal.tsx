import { useConnectOrCreateWallet, useModalStatus } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { SettlementChainId } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";

type ConnectModalContextValue = {
  openConnectModal: (() => void) | undefined;
  connectModalOpen: boolean;
};

const ConnectModalContext = createContext<ConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
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
  const connectRequestInFlightRef = useRef(false);
  const { isOpen: privyModalOpen } = useModalStatus();

  const handleSuccess = useCallback(() => {
    connectRequestInFlightRef.current = false;
    setConnectModalOpen(false);

    // @privy-io/wagmi already handles this callback by setting recentConnectorId
    // and reconnecting wagmi. Calling setActiveWallet here can re-enter wagmi connect.
    if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
      return;
    }

    void switchNetwork(settlementChainId, true).catch((error) => {
      metrics.pushError(error, "connectModal.switchNetwork");
    });
  }, [settlementChainId]);

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleSuccess,
    onError: () => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
    },
  });

  useEffect(() => {
    if (!privyModalOpen) {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
    }
  }, [privyModalOpen]);

  const openConnectModal = useCallback(() => {
    // MetaMask rejects duplicate connection requests while the first one is pending.
    if (connectRequestInFlightRef.current) {
      return;
    }

    connectRequestInFlightRef.current = true;
    setConnectModalOpen(true);
    try {
      connectOrCreateWallet();
    } catch (error) {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.open");
    }
  }, [connectOrCreateWallet]);

  const value = useMemo(() => ({ openConnectModal, connectModalOpen }), [openConnectModal, connectModalOpen]);

  return <ConnectModalContext.Provider value={value}>{children}</ConnectModalContext.Provider>;
}

/**
 * Drop-in replacement for RainbowKit's useConnectModal.
 * Returns { openConnectModal, connectModalOpen } with the same interface.
 */
export function useConnectModal() {
  return useContext(ConnectModalContext);
}
