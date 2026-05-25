import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";

import { PrivyWalletLoaderContext, PrivyWalletLoadStatus } from "./privyWalletLoader";
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

function BaseWagmiProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={getWagmiConfig()}>{children}</WagmiProvider>;
}

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [loadStatus, setLoadStatus] = useState<PrivyWalletLoadStatus>(() =>
    hasStoredPrivySession() ? "loading" : "idle"
  );
  const [isPrivyWalletReady, setIsPrivyWalletReady] = useState(false);

  const loadPrivyWalletProvider = useCallback(() => {
    setLoadStatus((currentStatus) => (currentStatus === "idle" ? "loading" : currentStatus));
  }, []);

  const markPrivyWalletProviderLoaded = useCallback(() => {
    setLoadStatus("loaded");
  }, []);

  const markPrivyWalletReady = useCallback(() => {
    setIsPrivyWalletReady(true);
  }, []);

  const loaderValue = useMemo(
    () => ({
      loadPrivyWalletProvider,
      privyWalletLoadStatus: loadStatus,
      isPrivyWalletProviderLoading: loadStatus === "loading",
      isPrivyWalletProviderLoaded: loadStatus === "loaded",
      isPrivyWalletReady,
      isPrivyWalletInitializing: loadStatus === "loading" || (loadStatus === "loaded" && !isPrivyWalletReady),
    }),
    [isPrivyWalletReady, loadPrivyWalletProvider, loadStatus]
  );

  const baseWalletTree = <BaseWagmiProvider>{children}</BaseWagmiProvider>;

  return (
    <PrivyWalletLoaderContext.Provider value={loaderValue}>
      <ConnectModalProvider>
        <QueryClientProvider client={queryClient}>
          {loadStatus === "idle" ? (
            baseWalletTree
          ) : (
            <Suspense fallback={baseWalletTree}>
              <LazyPrivyWalletProvider onLoaded={markPrivyWalletProviderLoaded} onReady={markPrivyWalletReady}>
                {children}
              </LazyPrivyWalletProvider>
            </Suspense>
          )}
        </QueryClientProvider>
      </ConnectModalProvider>
    </PrivyWalletLoaderContext.Provider>
  );
}
