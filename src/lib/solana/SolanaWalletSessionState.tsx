import { useCallback, useEffect, useMemo, useState } from "react";

import { SOLANA_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";
import { Storage } from "lib/storage/Storage";
import type {
  SolanaConnectedWallet,
  SolanaWalletList,
  SolanaWalletSessionContextValue,
} from "lib/wallets/solanaWalletSession";

import SolanaWalletSessionSync from "./SolanaWalletSessionSync";

// Wallets that never restore (no prior authorization), or a Privy that never reports ready, must not leave
// the header on the placeholder. If Privy reports ready before the timer ends, the wallet gets a full timeout from then.
const RESTORE_TIMEOUT_MS = 4_000;

export default function SolanaWalletSessionState({
  onChange,
}: {
  onChange: (session: SolanaWalletSessionContextValue) => void;
}) {
  const storage = useMemo(() => new Storage<{ walletId: string | undefined }>(SOLANA_WALLET_LOCAL_STORAGE_KEY), []);
  const [walletId, setWalletId] = useState(() => storage.get("walletId"));
  const [listed, setListed] = useState<SolanaWalletList>({ ready: false, wallets: [] });
  const [restoreTimedOut, setRestoreTimedOut] = useState(false);

  const rememberConnectedWallet = useCallback(
    (nextWalletId: string | undefined) => {
      storage.set("walletId", nextWalletId);
      setWalletId(nextWalletId);
    },
    [storage]
  );

  const handleWallets = useCallback((update: SolanaWalletList) => {
    setListed(update);
  }, []);

  const wallet: SolanaConnectedWallet | undefined = walletId
    ? listed.wallets.find((item) => item.walletId === walletId)
    : undefined;

  useEffect(() => {
    if (!walletId || wallet) {
      setRestoreTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setRestoreTimedOut(true), RESTORE_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [listed.ready, wallet, walletId]);

  const disconnect = useMemo(
    () =>
      wallet
        ? async () => {
            rememberConnectedWallet(undefined);
            await wallet.disconnect();
          }
        : undefined,
    [rememberConnectedWallet, wallet]
  );

  const session = useMemo<SolanaWalletSessionContextValue>(
    () => ({
      address: wallet?.address,
      disconnect,
      isRestoring: Boolean(walletId) && !wallet && !restoreTimedOut,
      rememberConnectedWallet,
    }),
    [disconnect, rememberConnectedWallet, restoreTimedOut, wallet, walletId]
  );

  useEffect(() => {
    onChange(session);
  }, [onChange, session]);

  return <SolanaWalletSessionSync walletId={walletId} onChange={handleWallets} />;
}
