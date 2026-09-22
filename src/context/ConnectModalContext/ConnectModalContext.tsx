import { useConnectOrCreateWallet, useConnectWallet, useLogin, useModalStatus, usePrivy } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { SettlementChainId } from "config/chains";
import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { isAppSelectedSolana } from "lib/chains/useChainIdImpl";
import { metrics } from "lib/metrics";
import { useBlockAutoReload } from "lib/pwa/blockAutoReload";
import { switchNetwork } from "lib/wallets";
import {
  clearSuppressedSolanaWallet,
  rememberSolanaWallet,
} from "solana-interface/wallet/solanaWalletSession";

export type ConnectModalOptions = {
  preSelectedWalletId?: string;
};

export type ConnectModalContextValue = {
  openConnectModal: ((options?: ConnectModalOptions) => void) | undefined;
  connectModalOpen: boolean;
};

export const ConnectModalContext = createContext<ConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
});

function readSolanaSelected() {
  const rawChainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  return isAppSelectedSolana({
    chainIdFromLocalStorage: rawChainId ? Number(rawChainId) : undefined,
    selectedNetworkWasAppSelected: localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true",
  });
}

function shouldKeepAppSelectedSourceChain(settlementChainId: SettlementChainId) {
  const rawChainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
  const chainIdFromLocalStorage = rawChainIdFromLocalStorage ? parseInt(rawChainIdFromLocalStorage) : undefined;
  const selectedNetworkWasAppSelected =
    localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY) === "true";

  return selectedNetworkWasAppSelected && isSourceChain(chainIdFromLocalStorage, settlementChainId);
}

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const connectRequestInFlightRef = useRef(false);
  const { isOpen: privyModalOpen } = useModalStatus();
  const { authenticated } = usePrivy();

  useBlockAutoReload(connectModalOpen || privyModalOpen);

  const handleSuccess = useCallback(
    (params?: { wallet?: { type?: string; address?: string; meta?: { name?: string } } }) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);

      if (params?.wallet?.type === "solana" && params.wallet.address) {
        clearSuppressedSolanaWallet();
        rememberSolanaWallet({
          address: params.wallet.address,
          name: params.wallet.meta?.name ?? "Solana",
        });
        return;
      }

      if (readSolanaSelected()) return;

      // @privy-io/wagmi already handles this callback by setting recentConnectorId
      // and reconnecting wagmi. Calling setActiveWallet here can re-enter wagmi connect.
      if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
        return;
      }

      void switchNetwork(settlementChainId, true).catch((error) => {
        metrics.pushError(error, "connectModal.switchNetwork");
      });
    },
    [settlementChainId]
  );

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleSuccess,
    onError: (error) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.connectOrCreateWallet");
    },
  });
  const { login } = useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (wasAlreadyAuthenticated) return;
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
    },
    onError: (error) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.login");
    },
  });
  const { connectWallet } = useConnectWallet({
    onSuccess: handleSuccess,
    onError: (error) => {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
      metrics.pushError(error, "connectModal.connectWallet");
    },
  });

  useEffect(() => {
    if (!privyModalOpen) {
      connectRequestInFlightRef.current = false;
      setConnectModalOpen(false);
    }
  }, [privyModalOpen]);

  const openConnectModal = useCallback(
    (options?: ConnectModalOptions) => {
      // MetaMask rejects duplicate connection requests while the first one is pending.
      if (connectRequestInFlightRef.current) {
        return;
      }

      connectRequestInFlightRef.current = true;
      setConnectModalOpen(true);
      const solanaSelected = readSolanaSelected();
      const walletChainType = solanaSelected ? "solana-only" : "ethereum-only";
      try {
        // Privy rejects connectOrCreateWallet for already-authenticated sessions.
        if (authenticated) {
          connectWallet({
            walletChainType,
            ...(options?.preSelectedWalletId ? { preSelectedWalletId: options.preSelectedWalletId } : {}),
          });
        } else if (solanaSelected) {
          login({ walletChainType: "solana-only" });
        } else {
          connectOrCreateWallet();
        }
      } catch (error) {
        connectRequestInFlightRef.current = false;
        setConnectModalOpen(false);
        metrics.pushError(error, "connectModal.open");
      }
    },
    [authenticated, connectOrCreateWallet, connectWallet, login]
  );

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
