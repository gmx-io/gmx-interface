import type { ReactNode } from "react";

import { SolanaWalletAssetsContext } from "domain/solana/SolanaWalletAssetsContext";

import { useGmsolWalletAssets } from "./useGmsolWalletAssets";

export default function GmsolWalletAssetsProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const walletAssets = useGmsolWalletAssets(owner);
  return <SolanaWalletAssetsContext.Provider value={walletAssets}>{children}</SolanaWalletAssetsContext.Provider>;
}
