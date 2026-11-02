import { useStandardWallets, useWallets } from "@privy-io/react-auth/solana";
import { useEffect, useRef } from "react";

import type { SolanaWalletList } from "lib/wallets/solanaWalletSession";

export default function SolanaWalletSessionSync({
  walletId,
  onChange,
}: {
  walletId: string | undefined;
  onChange: (update: SolanaWalletList) => void;
}) {
  const { wallets, ready } = useWallets();
  const { wallets: standardWallets, ready: standardReady } = useStandardWallets();
  const silentConnectAttempted = useRef<string>();

  useEffect(() => {
    onChange({
      ready: ready && standardReady,
      wallets: wallets.map((wallet) => ({
        address: wallet.address,
        walletId: wallet.standardWallet.name,
        // TokenPocket's Solana provider has no standard:disconnect; calling disconnect() throws and
        // leaves the wallet connected in Privy.
        disconnect: wallet.standardWallet.features["standard:disconnect"]
          ? () => wallet.disconnect()
          : () => Promise.resolve(),
      })),
    });
  }, [onChange, ready, standardReady, wallets]);

  useEffect(() => () => onChange({ ready: false, wallets: [] }), [onChange]);

  useEffect(() => {
    if (!standardReady || !walletId || wallets.some((wallet) => wallet.standardWallet.name === walletId)) {
      return;
    }

    // Privy only auto-connects Phantom when privy:connections has a Phantom EVM entry, so a
    // Solana-only Phantom never restores. Ask the wallet itself for accounts it already authorized.
    const connect = standardWallets.find((wallet) => wallet.name === walletId)?.features["standard:connect"]?.connect;
    if (!connect || silentConnectAttempted.current === walletId) {
      return;
    }

    silentConnectAttempted.current = walletId;
    // A wallet that never authorized this site rejects silent connect. The session timeout ends the placeholder.
    void connect({ silent: true }).catch(() => undefined);
  }, [standardReady, standardWallets, walletId, wallets]);

  return null;
}
