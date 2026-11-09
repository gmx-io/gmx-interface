import { useMemo } from "react";

import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import type { GtPointsData } from "./gtPointsTypes";

// Solana GT data is not wired yet: values stay unavailable until the Solana GT sources exist.
export function useGtPointsData(): GtPointsData {
  const solanaWallet = useSolanaWalletSession();

  const liveData = useMemo<GtPointsData>(
    () => ({
      account: solanaWallet.address,
      isWalletInitializing: solanaWallet.isRestoring,
      isLoading: false,
      my: undefined,
      global: undefined,
      buyback: undefined,
      stake: undefined,
    }),
    [solanaWallet.address, solanaWallet.isRestoring]
  );

  return liveData;
}
