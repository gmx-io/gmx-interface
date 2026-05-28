import {
  useConnectOrCreateWallet,
  useCreateWallet,
  useLogin,
  useWallets,
  type ConnectedWallet,
  type PrivyEvents,
} from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { getAccount, watchAccount } from "@wagmi/core";
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

import {
  getEmbeddedEthereumWallet,
  getEthereumWalletStorageValue,
  findActivePrivyWalletByStorageValue,
  isWagmiAccountActivePrivyWallet,
  writeActivePrivyWalletToStorage,
  type ActivePrivyWalletStorageValue,
} from "./activeWalletStorage";
import { getWagmiConfig } from "./walletConfig";

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

const ACTIVE_WALLET_TIMEOUT_MS = 5000;

function isWalletLoginMethod(loginMethod: LoginCompleteParams["loginMethod"]) {
  return loginMethod === "siwe" || loginMethod === "siws";
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
    return getEthereumWalletStorageValue(loginAccount);
  }

  const embeddedWallet = getEmbeddedEthereumWallet(user);

  if (embeddedWallet) {
    return embeddedWallet;
  }

  return undefined;
}

function getCurrentWagmiAccount() {
  const account = getAccount(getWagmiConfig());

  return {
    address: account.address,
    connectorId: account.connector?.id,
  };
}

function waitForActiveWagmiWallet(activeWallet: ActivePrivyWalletStorageValue) {
  if (isWagmiAccountActivePrivyWallet(getCurrentWagmiAccount(), activeWallet)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const config = getWagmiConfig();
    let unsubscribe: (() => void) | undefined;

    const timeout = window.setTimeout(() => {
      unsubscribe?.();
      reject(new Error(`Timed out waiting for active wallet ${activeWallet.address}`));
    }, ACTIVE_WALLET_TIMEOUT_MS);

    unsubscribe = watchAccount(config, {
      onChange: (account) => {
        if (
          isWagmiAccountActivePrivyWallet(
            {
              address: account.address,
              connectorId: account.connector?.id,
            },
            activeWallet
          )
        ) {
          window.clearTimeout(timeout);
          unsubscribe?.();
          resolve();
        }
      },
    });
  });
}

function waitForPrivyWallet(
  walletsRef: React.RefObject<ConnectedWallet[]>,
  activeWallet: ActivePrivyWalletStorageValue
) {
  const wallet = findActivePrivyWalletByStorageValue(walletsRef.current ?? [], activeWallet);

  if (wallet) {
    return Promise.resolve(wallet);
  }

  return new Promise<ConnectedWallet | undefined>((resolve) => {
    const timeoutStartedAt = Date.now();

    const interval = window.setInterval(() => {
      const wallet = findActivePrivyWalletByStorageValue(walletsRef.current ?? [], activeWallet);

      if (wallet) {
        window.clearInterval(interval);
        resolve(wallet);
        return;
      }

      if (Date.now() - timeoutStartedAt >= ACTIVE_WALLET_TIMEOUT_MS) {
        window.clearInterval(interval);
        resolve(undefined);
      }
    }, 50);
  });
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
  const { createWallet } = useCreateWallet();
  const { setActiveWallet } = useSetActiveWallet();
  const { wallets } = useWallets();
  const walletsRef = useRef(wallets);

  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  const handleSuccess = useCallback(() => {
    setConnectModalOpen(false);

    if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
      return;
    }

    void switchNetwork(settlementChainId, true).catch((error) => {
      metrics.pushError(error, "connectModal.switchNetwork");
    });
  }, [settlementChainId]);

  const activateActiveWallet = useCallback(
    async (activeWalletStorageValue: ActivePrivyWalletStorageValue, connectedWallet?: ConnectedWallet) => {
      writeActivePrivyWalletToStorage(activeWalletStorageValue);

      const wallet = connectedWallet ?? (await waitForPrivyWallet(walletsRef, activeWalletStorageValue));

      if (wallet) {
        try {
          await setActiveWallet(wallet);
        } catch (error) {
          metrics.pushError(error, "connectModal.setActiveWallet");
        }
      }

      try {
        await waitForActiveWagmiWallet(activeWalletStorageValue);
      } catch (error) {
        metrics.pushError(error, "connectModal.waitForActiveWallet");
        setConnectModalOpen(false);
        return;
      }

      handleSuccess();
    },
    [handleSuccess, setActiveWallet]
  );

  const handleConnectOrCreateWalletSuccess = useCallback(
    async (params: ConnectOrCreateWalletSuccessParams) => {
      const activeWalletStorageValue = getEthereumWalletStorageValue(params.wallet);

      if (!activeWalletStorageValue) {
        handleSuccess();
        return;
      }

      await activateActiveWallet(
        activeWalletStorageValue,
        params.wallet.type === "ethereum" ? (params.wallet as ConnectedWallet) : undefined
      );
    },
    [activateActiveWallet, handleSuccess]
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
        void activateActiveWallet(activeWalletStorageValue);
        return;
      }

      if (!isWalletLoginMethod(params.loginMethod)) {
        void createWallet()
          .then((wallet) => {
            const createdWalletStorageValue = getEthereumWalletStorageValue(wallet);

            if (!createdWalletStorageValue) {
              handleSuccess();
              return;
            }

            return activateActiveWallet(createdWalletStorageValue);
          })
          .catch((error) => {
            metrics.pushError(error, "connectModal.createAndActivateWallet");
            setConnectModalOpen(false);
          });

        return;
      }

      handleSuccess();
    },
    [activateActiveWallet, createWallet, handleSuccess]
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
