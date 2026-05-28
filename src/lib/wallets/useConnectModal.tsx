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
  removeActivePrivyWalletFromStorage,
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

type ConnectAttempt = {
  id: number;
  startedAt: number;
  existingWalletConnectedAt: Map<string, number>;
};

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

function getActiveWalletKey(wallet: ActivePrivyWalletStorageValue) {
  return [wallet.address.toLowerCase(), wallet.connectorId, wallet.connectorType, wallet.walletClientType].join(":");
}

function getConnectedWalletsAtOpen(wallets: ConnectedWallet[]) {
  return new Map(
    wallets
      .map((wallet) => {
        const activeWalletStorageValue = getEthereumWalletStorageValue(wallet);

        return activeWalletStorageValue
          ? ([getActiveWalletKey(activeWalletStorageValue), wallet.connectedAt] as const)
          : undefined;
      })
      .filter((entry): entry is readonly [string, number] => entry !== undefined)
  );
}

function wasWalletConnectedDuringAttempt(
  wallet: ConnectedWallet,
  activeWalletStorageValue: ActivePrivyWalletStorageValue,
  connectAttempt: ConnectAttempt
) {
  const connectedAtBeforeAttempt = connectAttempt.existingWalletConnectedAt.get(
    getActiveWalletKey(activeWalletStorageValue)
  );

  if (connectedAtBeforeAttempt !== undefined && wallet.connectedAt === connectedAtBeforeAttempt) {
    return false;
  }

  return wallet.connectedAt >= connectAttempt.startedAt;
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
  const nextConnectAttemptIdRef = useRef(0);
  const activeConnectAttemptRef = useRef<ConnectAttempt | undefined>(undefined);

  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  const isConnectAttemptActive = useCallback((connectAttemptId: number | undefined) => {
    return connectAttemptId !== undefined && activeConnectAttemptRef.current?.id === connectAttemptId;
  }, []);

  const cancelActiveConnectAttempt = useCallback(
    (connectAttemptId?: number) => {
      if (connectAttemptId !== undefined && !isConnectAttemptActive(connectAttemptId)) {
        return;
      }

      if (activeConnectAttemptRef.current === undefined) {
        return;
      }

      activeConnectAttemptRef.current = undefined;
      removeActivePrivyWalletFromStorage();
      setConnectModalOpen(false);
    },
    [isConnectAttemptActive]
  );

  const handleSuccess = useCallback(
    (connectAttemptId?: number) => {
      if (connectAttemptId !== undefined && !isConnectAttemptActive(connectAttemptId)) {
        return;
      }

      activeConnectAttemptRef.current = undefined;
      setConnectModalOpen(false);

      if (shouldKeepAppSelectedSourceChain(settlementChainId)) {
        return;
      }

      void switchNetwork(settlementChainId, true).catch((error) => {
        metrics.pushError(error, "connectModal.switchNetwork");
      });
    },
    [isConnectAttemptActive, settlementChainId]
  );

  const activateActiveWallet = useCallback(
    async (
      activeWalletStorageValue: ActivePrivyWalletStorageValue,
      connectedWallet: ConnectedWallet | undefined,
      connectAttemptId: number
    ) => {
      if (!isConnectAttemptActive(connectAttemptId)) {
        return;
      }

      writeActivePrivyWalletToStorage(activeWalletStorageValue);

      const wallet = connectedWallet ?? (await waitForPrivyWallet(walletsRef, activeWalletStorageValue));

      if (!isConnectAttemptActive(connectAttemptId)) {
        removeActivePrivyWalletFromStorage();
        return;
      }

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
        cancelActiveConnectAttempt();
        return;
      }

      handleSuccess(connectAttemptId);
    },
    [cancelActiveConnectAttempt, handleSuccess, isConnectAttemptActive, setActiveWallet]
  );

  const handleConnectOrCreateWalletSuccess = useCallback(
    async (params: ConnectOrCreateWalletSuccessParams) => {
      const connectAttempt = activeConnectAttemptRef.current;

      if (!connectAttempt) {
        return;
      }

      const activeWalletStorageValue = getEthereumWalletStorageValue(params.wallet);

      if (!activeWalletStorageValue) {
        handleSuccess(connectAttempt.id);
        return;
      }

      if (
        params.wallet.type === "ethereum" &&
        !wasWalletConnectedDuringAttempt(params.wallet as ConnectedWallet, activeWalletStorageValue, connectAttempt)
      ) {
        cancelActiveConnectAttempt(connectAttempt.id);
        return;
      }

      await activateActiveWallet(
        activeWalletStorageValue,
        params.wallet.type === "ethereum" ? (params.wallet as ConnectedWallet) : undefined,
        connectAttempt.id
      );
    },
    [activateActiveWallet, cancelActiveConnectAttempt, handleSuccess]
  );

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleConnectOrCreateWalletSuccess,
    onError: () => cancelActiveConnectAttempt(),
  });

  const handleLoginComplete = useCallback(
    (params: LoginCompleteParams) => {
      const connectAttemptId = activeConnectAttemptRef.current?.id;

      if (connectAttemptId === undefined) {
        return;
      }

      if (params.wasAlreadyAuthenticated) {
        return;
      }

      const activeWalletStorageValue = getActiveWalletStorageValueAfterLogin(params);

      if (activeWalletStorageValue) {
        void activateActiveWallet(activeWalletStorageValue, undefined, connectAttemptId);
        return;
      }

      if (!isWalletLoginMethod(params.loginMethod)) {
        void createWallet()
          .then((wallet) => {
            const createdWalletStorageValue = getEthereumWalletStorageValue(wallet);

            if (!createdWalletStorageValue) {
              handleSuccess(connectAttemptId);
              return;
            }

            return activateActiveWallet(createdWalletStorageValue, undefined, connectAttemptId);
          })
          .catch((error) => {
            metrics.pushError(error, "connectModal.createAndActivateWallet");
            cancelActiveConnectAttempt();
          });

        return;
      }

      handleSuccess(connectAttemptId);
    },
    [activateActiveWallet, cancelActiveConnectAttempt, createWallet, handleSuccess]
  );

  useLogin({
    onComplete: handleLoginComplete,
    onError: () => cancelActiveConnectAttempt(),
  });

  const openConnectModal = useCallback(() => {
    const connectAttemptId = nextConnectAttemptIdRef.current + 1;
    nextConnectAttemptIdRef.current = connectAttemptId;
    activeConnectAttemptRef.current = {
      id: connectAttemptId,
      startedAt: Date.now(),
      existingWalletConnectedAt: getConnectedWalletsAtOpen(walletsRef.current ?? []),
    };
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
