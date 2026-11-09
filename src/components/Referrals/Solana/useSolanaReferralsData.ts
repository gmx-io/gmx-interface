import { t } from "@lingui/macro";
import { useMemo } from "react";

import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import type { SolanaReferralsData } from "./solanaReferralsTypes";

async function notConnectedYet(): Promise<void> {
  throw new Error(t`Solana referrals are not connected yet`);
}

// Solana referral data is not wired yet: codes, stats and the GT holders list stay empty until the Solana sources exist.
export function useSolanaReferralsData(): SolanaReferralsData {
  const solanaWallet = useSolanaWalletSession();

  const liveData = useMemo<SolanaReferralsData>(
    () => ({
      account: solanaWallet.address,
      isWalletInitializing: solanaWallet.isRestoring,
      isLoading: false,
      appliedCode: undefined,
      traderPoints: [],
      affiliate: undefined,
      topHolders: [],
      applyCode: notConnectedYet,
      createCode: notConnectedYet,
    }),
    [solanaWallet.address, solanaWallet.isRestoring]
  );

  return liveData;
}
