import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";

import { PrivyWalletLoaderContext } from "context/PrivyWalletContext/PrivyWalletLoaderContext";

import { ConnectModalProvider } from "./useConnectModal";
import { getWagmiConfig } from "./walletConfig";

const queryClient = new QueryClient();

const LazyPrivyWalletProvider = lazy(() => import("./PrivyWalletProvider"));

function hasStoredPrivySession() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasPrivyStorageKey = (storage: Storage) => {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);

      if (key?.toLowerCase().includes("privy")) {
        return true;
      }
    }

    return false;
  };

  try {
    return hasPrivyStorageKey(window.localStorage) || hasPrivyStorageKey(window.sessionStorage);
  } catch {
    return false;
  }
}

function schedulePrivyPreload(loadPrivyWalletProvider: () => void) {
  let idleCallbackId: number | undefined;
  let timeoutId: number | undefined;

  if (typeof window.requestIdleCallback === "function") {
    idleCallbackId = window.requestIdleCallback(loadPrivyWalletProvider, { timeout: 3000 });
  } else {
    timeoutId = window.setTimeout(loadPrivyWalletProvider, 1000);
  }

  return () => {
    if (idleCallbackId !== undefined) {
      window.cancelIdleCallback(idleCallbackId);
    }

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}

function BaseWagmiProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={getWagmiConfig()}>{children}</WagmiProvider>;
}

type WalletProviderProps = {
  children: React.ReactNode;
};

export default function WalletProvider({ children }: WalletProviderProps) {
  const [shouldLoadPrivyWalletProvider, setShouldLoadPrivyWalletProvider] = useState(() => hasStoredPrivySession());
  const [isPrivyWalletReady, setIsPrivyWalletReady] = useState(false);

  const loadPrivyWalletProvider = useCallback(() => {
    setShouldLoadPrivyWalletProvider(true);
  }, []);

  const markPrivyWalletReady = useCallback(() => {
    setIsPrivyWalletReady(true);
  }, []);

  useEffect(
    function preloadPrivyWalletProviderAfterPageLoad() {
      if (shouldLoadPrivyWalletProvider) {
        return undefined;
      }

      let cancelPrivyPreload: (() => void) | undefined;

      const preloadPrivyWalletProvider = () => {
        cancelPrivyPreload = schedulePrivyPreload(loadPrivyWalletProvider);
      };

      if (document.readyState === "complete") {
        preloadPrivyWalletProvider();
      } else {
        window.addEventListener("load", preloadPrivyWalletProvider, { once: true });
      }

      return () => {
        window.removeEventListener("load", preloadPrivyWalletProvider);
        cancelPrivyPreload?.();
      };
    },
    [loadPrivyWalletProvider, shouldLoadPrivyWalletProvider]
  );

  const loaderValue = useMemo(
    () => ({
      loadPrivyWalletProvider,
      isPrivyWalletReady,
      isPrivyWalletInitializing: shouldLoadPrivyWalletProvider && !isPrivyWalletReady,
    }),
    [isPrivyWalletReady, loadPrivyWalletProvider, shouldLoadPrivyWalletProvider]
  );

  const baseWalletTree = <BaseWagmiProvider>{children}</BaseWagmiProvider>;
  const walletTree = (
    <QueryClientProvider client={queryClient}>
      {shouldLoadPrivyWalletProvider ? (
        <Suspense fallback={baseWalletTree}>
          <LazyPrivyWalletProvider onReady={markPrivyWalletReady}>{children}</LazyPrivyWalletProvider>
        </Suspense>
      ) : (
        baseWalletTree
      )}
    </QueryClientProvider>
  );

  return (
    <PrivyWalletLoaderContext.Provider value={loaderValue}>
      <ConnectModalProvider>{walletTree}</ConnectModalProvider>
    </PrivyWalletLoaderContext.Provider>
  );
}
