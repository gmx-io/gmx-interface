import { SOLANA_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";
import { Storage } from "lib/storage/Storage";
import { watchSolanaLinkedEvmConnectors } from "lib/wallets/solanaLinkedEvmConnectors";

import { solanaWalletConnectors } from "./privySolanaConnectors";

// One chunk: Privy's Solana connectors and the EVM-connector watcher. bootstrap() loads it only when
// solanaNetwork is on, so a failed fetch reaches showAppLoadError instead of leaving the splash up.
export function startSolanaWallet() {
  watchSolanaLinkedEvmConnectors();
  const rememberedWalletId = new Storage<{ walletId: string | undefined }>(SOLANA_WALLET_LOCAL_STORAGE_KEY).get(
    "walletId"
  );

  return { connectors: solanaWalletConnectors, rememberedWalletId };
}
