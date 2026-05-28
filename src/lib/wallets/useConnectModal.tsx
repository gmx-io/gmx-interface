import { useConnectOrCreateWallet, useLogin, usePrivy, type PrivyEvents } from "@privy-io/react-auth";
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
  getEmbeddedEthereumWallet,
  writeActivePrivyWalletToStorage,
  type ActivePrivyWalletStorageValue,
} from "./activeWalletStorage";

type ConnectModalContextValue = {
  openConnectModal: (() => void) | undefined;
  connectModalOpen: boolean;
};

const ConnectModalContext = createContext<ConnectModalContextValue>({
  openConnectModal: undefined,
  connectModalOpen: false,
});

type LoginCompleteParams = Parameters<NonNullable<PrivyEvents["login"]["onComplete"]>>[0];
type ConnectOrCreateWalletSuccessParams = Parameters<NonNullable<PrivyEvents["connectOrCreateWallet"]["onSuccess"]>>[0];

function isWalletLoginMethod(loginMethod: LoginCompleteParams["loginMethod"]) {
  return loginMethod === "siwe" || loginMethod === "siws";
}

function getEthereumWalletLoginAccount(loginAccount: LoginCompleteParams["loginAccount"]) {
  if (!loginAccount || loginAccount.type !== "wallet" || loginAccount.chainType !== "ethereum") {
    return undefined;
  }

  return {
    address: loginAccount.address,
    connectorType: loginAccount.connectorType,
    walletClientType: loginAccount.walletClientType,
  };
}

export function getActiveWalletStorageValueAfterLogin({
  loginAccount,
  loginMethod,
  wasAlreadyAuthenticated,
  user,
}: Pick<LoginCompleteParams, "loginMethod" | "user" | "wasAlreadyAuthenticated"> &
  Partial<Pick<LoginCompleteParams, "loginAccount">>): ActivePrivyWalletStorageValue | undefined {
  if (wasAlreadyAuthenticated) {
    return undefined;
  }

  if (isWalletLoginMethod(loginMethod)) {
    return getEthereumWalletLoginAccount(loginAccount ?? null);
  }

  const embeddedWallet = getEmbeddedEthereumWallet(user);

  if (embeddedWallet) {
    return embeddedWallet;
  }

  return undefined;
}

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
  const { user } = usePrivy();

  const handleSuccess = useCallback(() => {
    setConnectModalOpen(false);

    if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
      return;
    }

    void switchNetwork(settlementChainId, true).catch((error) => {
      metrics.pushError(error, "connectModal.switchNetwork");
    });
  }, [settlementChainId]);

  const handleConnectOrCreateWalletSuccess = useCallback(
    (params: ConnectOrCreateWalletSuccessParams) => {
      writeActivePrivyWalletToStorage(user?.id, params.wallet);
      handleSuccess();
    },
    [handleSuccess, user?.id]
  );

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleConnectOrCreateWalletSuccess,
    onError: () => setConnectModalOpen(false),
  });

  const handleLoginComplete = useCallback(
    (params: LoginCompleteParams) => {
      if (params.wasAlreadyAuthenticated) {
        return;
      }

      const activeWalletStorageValue = getActiveWalletStorageValueAfterLogin(params);

      if (activeWalletStorageValue) {
        writeActivePrivyWalletToStorage(params.user.id, activeWalletStorageValue);
      }

      handleSuccess();
    },
    [handleSuccess]
  );

  useLogin({
    onComplete: handleLoginComplete,
    onError: () => setConnectModalOpen(false),
  });

  const openConnectModal = useCallback(() => {
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
