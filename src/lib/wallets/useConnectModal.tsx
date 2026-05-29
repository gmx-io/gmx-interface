import { useConnectOrCreateWallet, useLogin, type LinkedAccountWithMetadata } from "@privy-io/react-auth";
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

import {
  markPrivyConnectFailed,
  markPrivyConnectStarted,
  preferEmbeddedWalletForCurrentPrivyConnect,
} from "./privyWalletSelection";

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

function shouldPreferEmbeddedWalletForLogin({
  loginAccount,
  loginMethod,
}: {
  loginAccount: LinkedAccountWithMetadata | null;
  loginMethod: string | null;
}) {
  if (!loginMethod || loginMethod === "siwe" || loginMethod === "siws") {
    return false;
  }

  return loginAccount?.type !== "wallet";
}

export function ConnectModalProvider({ children }: { children: React.ReactNode }) {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    setConnectModalOpen(false);

    if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
      return;
    }

    void switchNetwork(settlementChainId, true).catch((error) => {
      metrics.pushError(error, "connectModal.switchNetwork");
    });
  }, [settlementChainId]);

  const handleError = useCallback(() => {
    markPrivyConnectFailed();
    setConnectModalOpen(false);
  }, []);
  const handleLoginComplete = useCallback(
    ({ loginAccount, loginMethod }: { loginAccount: LinkedAccountWithMetadata | null; loginMethod: string | null }) => {
      if (connectModalOpen) {
        if (shouldPreferEmbeddedWalletForLogin({ loginAccount, loginMethod })) {
          preferEmbeddedWalletForCurrentPrivyConnect();
        }

        handleSuccess();
      }
    },
    [connectModalOpen, handleSuccess]
  );

  useLogin({
    onComplete: handleLoginComplete,
  });

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const openConnectModal = useCallback(() => {
    markPrivyConnectStarted();
    setConnectModalOpen(true);
    connectOrCreateWallet();
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
