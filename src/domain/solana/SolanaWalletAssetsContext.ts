import { createContext, useContext } from "react";

import type { SolanaWalletAsset } from "./solanaWalletAssets";

export type SolanaWalletAssetsState = {
  assets: SolanaWalletAsset[] | undefined;
  totalUsd: bigint | undefined;
  isLoading: boolean;
  balancesError: Error | undefined;
  pricesError: Error | undefined;
};

export const SolanaWalletAssetsContext = createContext<SolanaWalletAssetsState>({
  assets: undefined,
  totalUsd: undefined,
  isLoading: true,
  balancesError: undefined,
  pricesError: undefined,
});

export function useSolanaWalletAssets() {
  return useContext(SolanaWalletAssetsContext);
}
