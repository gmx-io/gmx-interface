import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { PrivyWalletLoaderContext } from "./privyWalletLoader";
import { getWagmiConfig } from "./walletConfig";

export const walletQueryClient = new QueryClient();

const disabledPrivyWalletLoaderValue = {
  loadPrivyWalletProvider: () => undefined,
  isPrivyWalletReady: false,
  isPrivyWalletInitializing: false,
};

export function BaseWagmiProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={getWagmiConfig()}>{children}</WagmiProvider>;
}

export function BaseWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyWalletLoaderContext.Provider value={disabledPrivyWalletLoaderValue}>
      <QueryClientProvider client={walletQueryClient}>
        <BaseWagmiProvider>{children}</BaseWagmiProvider>
      </QueryClientProvider>
    </PrivyWalletLoaderContext.Provider>
  );
}
