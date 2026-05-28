import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";

import { PrivyWalletLoaderContext } from "context/PrivyWalletContext/PrivyWalletLoaderContext";

import { ConnectModalProvider } from "./useConnectModal";
import { getWagmiConfig } from "./walletConfig";

const queryClient = new QueryClient();

const LazyPrivyWalletProvider = lazy(() => import("context/PrivyWalletContext/PrivyWalletProvider"));

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
