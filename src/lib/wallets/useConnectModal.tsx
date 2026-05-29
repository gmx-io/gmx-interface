import {
  useConnectOrCreateWallet,
  useCreateWallet,
  useLogin,
  useWallets,
  type ConnectedWallet,
  type PrivyEvents,
  type User,
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
  readActivePrivyWalletFromStorage,
  removeActivePrivyWalletFromStorage,
  shouldUseEmbeddedWalletFlow,
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
const PENDING_CONNECT_ATTEMPT_SESSION_STORAGE_KEY = "gmx:pending-connect-attempt";
const PENDING_CONNECT_ATTEMPT_TTL_MS = 15 * 60 * 1000;

type ConnectAttempt = {
  id: number;
  previousActiveWalletStorageValue: ActivePrivyWalletStorageValue | undefined;
  restoredFromPendingAttempt: boolean;
  writtenActiveWalletStorageValue: ActivePrivyWalletStorageValue | undefined;
};

function isWalletLoginMethod(loginMethod: LoginCompleteParams["loginMethod"]) {
  return loginMethod === "siwe" || loginMethod === "siws";
}

export function getLoginWalletStorageCandidate({
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

function readPendingConnectAttemptStartedAt() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = window.sessionStorage.getItem(PENDING_CONNECT_ATTEMPT_SESSION_STORAGE_KEY);
  const startedAt = value ? Number(value) : undefined;

  if (!startedAt || Date.now() - startedAt > PENDING_CONNECT_ATTEMPT_TTL_MS) {
    window.sessionStorage.removeItem(PENDING_CONNECT_ATTEMPT_SESSION_STORAGE_KEY);
    return undefined;
  }

  return startedAt;
}

function writePendingConnectAttempt(startedAt: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_CONNECT_ATTEMPT_SESSION_STORAGE_KEY, String(startedAt));
}

function removePendingConnectAttempt() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_CONNECT_ATTEMPT_SESSION_STORAGE_KEY);
}

function isSameActiveWalletStorageValue(
  walletA: ActivePrivyWalletStorageValue | undefined,
  walletB: ActivePrivyWalletStorageValue | undefined
) {
  return (
    walletA?.address === walletB?.address &&
    walletA?.connectorId === walletB?.connectorId &&
    walletA?.connectorType === walletB?.connectorType &&
    walletA?.walletClientType === walletB?.walletClientType
  );
}

function restoreActiveWalletStorageAfterCanceledAttempt(connectAttempt: ConnectAttempt) {
  if (!connectAttempt.writtenActiveWalletStorageValue) {
    return;
  }

  if (
    !isSameActiveWalletStorageValue(readActivePrivyWalletFromStorage(), connectAttempt.writtenActiveWalletStorageValue)
  ) {
    return;
  }

  if (connectAttempt.previousActiveWalletStorageValue) {
    writeActivePrivyWalletToStorage(connectAttempt.previousActiveWalletStorageValue);
    return;
  }

  removeActivePrivyWalletFromStorage();
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

  const startConnectAttempt = useCallback((startedAt = Date.now(), restoredFromPendingAttempt = false) => {
    const connectAttemptId = nextConnectAttemptIdRef.current + 1;
    nextConnectAttemptIdRef.current = connectAttemptId;
    activeConnectAttemptRef.current = {
      id: connectAttemptId,
      previousActiveWalletStorageValue: readActivePrivyWalletFromStorage(),
      restoredFromPendingAttempt,
      writtenActiveWalletStorageValue: undefined,
    };
    writePendingConnectAttempt(startedAt);

    return activeConnectAttemptRef.current;
  }, []);

  const getActiveConnectAttempt = useCallback(() => {
    if (activeConnectAttemptRef.current) {
      return activeConnectAttemptRef.current;
    }

    const startedAt = readPendingConnectAttemptStartedAt();

    return startedAt ? startConnectAttempt(startedAt, true) : undefined;
  }, [startConnectAttempt]);

  const cancelActiveConnectAttempt = useCallback(
    (connectAttemptId?: number) => {
      if (connectAttemptId !== undefined && !isConnectAttemptActive(connectAttemptId)) {
        return;
      }

      if (activeConnectAttemptRef.current === undefined) {
        return;
      }

      const connectAttempt = activeConnectAttemptRef.current;
      activeConnectAttemptRef.current = undefined;
      removePendingConnectAttempt();
      restoreActiveWalletStorageAfterCanceledAttempt(connectAttempt);
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
      removePendingConnectAttempt();
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

      const connectAttempt = activeConnectAttemptRef.current;

      if (!connectAttempt || connectAttempt.id !== connectAttemptId) {
        return;
      }

      const wallet = connectedWallet ?? (await waitForPrivyWallet(walletsRef, activeWalletStorageValue));

      if (!isConnectAttemptActive(connectAttemptId)) {
        restoreActiveWalletStorageAfterCanceledAttempt(connectAttempt);
        return;
      }

      const activeWalletToStore = wallet
        ? getEthereumWalletStorageValue(wallet) ?? activeWalletStorageValue
        : activeWalletStorageValue;

      if (!activeWalletToStore.connectorId && !wallet) {
        metrics.pushError(
          new Error(`Timed out waiting for Privy wallet ${activeWalletStorageValue.address}`),
          "connectModal.waitForPrivyWallet"
        );
        cancelActiveConnectAttempt(connectAttemptId);
        return;
      }

      connectAttempt.writtenActiveWalletStorageValue = activeWalletToStore;
      writeActivePrivyWalletToStorage(activeWalletToStore);

      if (wallet) {
        try {
          await setActiveWallet(wallet);
        } catch (error) {
          metrics.pushError(error, "connectModal.setActiveWallet");
        }
      }

      if (!isConnectAttemptActive(connectAttemptId)) {
        restoreActiveWalletStorageAfterCanceledAttempt(connectAttempt);
        return;
      }

      try {
        await waitForActiveWagmiWallet(activeWalletToStore);
      } catch (error) {
        if (!isConnectAttemptActive(connectAttemptId)) {
          restoreActiveWalletStorageAfterCanceledAttempt(connectAttempt);
          return;
        }

        metrics.pushError(error, "connectModal.waitForActiveWallet");
        cancelActiveConnectAttempt(connectAttemptId);
        return;
      }

      if (!isConnectAttemptActive(connectAttemptId)) {
        restoreActiveWalletStorageAfterCanceledAttempt(connectAttempt);
        return;
      }

      handleSuccess(connectAttemptId);
    },
    [cancelActiveConnectAttempt, handleSuccess, isConnectAttemptActive, setActiveWallet]
  );

  const activateEmbeddedWalletOrCreateWallet = useCallback(
    (user: User, connectAttemptId: number) => {
      const activeWalletStorageValue = getEmbeddedEthereumWallet(user);

      if (activeWalletStorageValue) {
        void activateActiveWallet(activeWalletStorageValue, undefined, connectAttemptId);
        return;
      }

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
          cancelActiveConnectAttempt(connectAttemptId);
        });
    },
    [activateActiveWallet, cancelActiveConnectAttempt, createWallet, handleSuccess]
  );

  const handleConnectOrCreateWalletSuccess = useCallback(
    async (params: ConnectOrCreateWalletSuccessParams) => {
      const connectAttempt = getActiveConnectAttempt();

      if (!connectAttempt) {
        return;
      }

      const activeWalletStorageValue = getEthereumWalletStorageValue(params.wallet);

      if (!activeWalletStorageValue) {
        handleSuccess(connectAttempt.id);
        return;
      }

      await activateActiveWallet(
        activeWalletStorageValue,
        params.wallet.type === "ethereum" ? (params.wallet as ConnectedWallet) : undefined,
        connectAttempt.id
      );
    },
    [activateActiveWallet, getActiveConnectAttempt, handleSuccess]
  );

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: handleConnectOrCreateWalletSuccess,
    onError: () => cancelActiveConnectAttempt(),
  });

  const connectAuthenticatedUser = useCallback(
    (user: User, connectAttemptId: number) => {
      if (shouldUseEmbeddedWalletFlow(user)) {
        activateEmbeddedWalletOrCreateWallet(user, connectAttemptId);
        return;
      }

      connectOrCreateWallet();
    },
    [activateEmbeddedWalletOrCreateWallet, connectOrCreateWallet]
  );

  const handleLoginComplete = useCallback(
    (params: LoginCompleteParams) => {
      const connectAttempt = getActiveConnectAttempt();

      if (!connectAttempt) {
        return;
      }

      const connectAttemptId = connectAttempt.id;

      if (params.wasAlreadyAuthenticated) {
        if (!connectAttempt.restoredFromPendingAttempt) {
          return;
        }

        if (!isWalletLoginMethod(params.loginMethod)) {
          connectAuthenticatedUser(params.user, connectAttemptId);
          return;
        }

        handleSuccess(connectAttemptId);
        return;
      }

      const activeWalletStorageValue = getLoginWalletStorageCandidate(params);

      if (activeWalletStorageValue) {
        void activateActiveWallet(activeWalletStorageValue, undefined, connectAttemptId);
        return;
      }

      if (!isWalletLoginMethod(params.loginMethod)) {
        activateEmbeddedWalletOrCreateWallet(params.user, connectAttemptId);
        return;
      }

      handleSuccess(connectAttemptId);
    },
    [
      activateActiveWallet,
      activateEmbeddedWalletOrCreateWallet,
      connectAuthenticatedUser,
      getActiveConnectAttempt,
      handleSuccess,
    ]
  );

  useLogin({
    onComplete: handleLoginComplete,
    onError: () => cancelActiveConnectAttempt(),
  });

  const openConnectModal = useCallback(() => {
    startConnectAttempt();
    setConnectModalOpen(true);
    connectOrCreateWallet();
  }, [connectOrCreateWallet, startConnectAttempt]);

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
