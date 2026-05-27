import { createContext, useContext } from "react";

type PrivyWalletLoaderContextValue = {
  loadPrivyWalletProvider: () => void;
  isPrivyWalletReady: boolean;
  isPrivyWalletInitializing: boolean;
};

export const PrivyWalletLoaderContext = createContext<PrivyWalletLoaderContextValue>({
  loadPrivyWalletProvider: () => undefined,
  isPrivyWalletReady: false,
  isPrivyWalletInitializing: false,
});

export function usePrivyWalletLoader() {
  return useContext(PrivyWalletLoaderContext);
}
