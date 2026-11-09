import { useMemo } from "react";

import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import type { SolanaEarnData } from "./solanaEarnTypes";

// Solana Earn data is not wired yet: GT and LP values stay unavailable until the Solana sources exist.
export function useSolanaEarnData(): SolanaEarnData {
  const solanaWallet = useSolanaWalletSession();

  const liveData = useMemo<SolanaEarnData>(
    () => ({
      account: solanaWallet.address,
      isWalletInitializing: solanaWallet.isRestoring,
      isLoading: false,
      gt: undefined,
      lp: undefined,
      assets: [],
    }),
    [solanaWallet.address, solanaWallet.isRestoring]
  );

  return liveData;
}
