import { createContext, useContext } from "react";

export type PrivyWalletLoadStatus = "idle" | "loading" | "loaded";

type PrivyWalletLoaderContextValue = {
  loadPrivyWalletProvider: () => void;
  privyWalletLoadStatus: PrivyWalletLoadStatus;
  isPrivyWalletProviderLoading: boolean;
  isPrivyWalletProviderLoaded: boolean;
  isPrivyWalletReady: boolean;
  isPrivyWalletInitializing: boolean;
};

export const PrivyWalletLoaderContext = createContext<PrivyWalletLoaderContextValue>({
  loadPrivyWalletProvider: () => undefined,
  privyWalletLoadStatus: "idle",
  isPrivyWalletProviderLoading: false,
  isPrivyWalletProviderLoaded: false,
  isPrivyWalletReady: false,
  isPrivyWalletInitializing: false,
});

export function usePrivyWalletLoader() {
  return useContext(PrivyWalletLoaderContext);
}
