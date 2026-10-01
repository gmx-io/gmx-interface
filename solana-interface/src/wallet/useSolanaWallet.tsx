import { useWallets as useEvmWallets } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { useChainId } from "lib/chains";

import {
  decideSolanaSession,
  isSupportedSolanaWalletName,
  readRememberedSolanaWallet,
  rememberSolanaWallet,
  subscribeSolanaWalletStore,
} from "./solanaWalletSession";

export function useRememberedSolanaWallet() {
  return useSyncExternalStore(subscribeSolanaWalletStore, readRememberedSolanaWallet, readRememberedSolanaWallet);
}

export function useSolanaWallet() {
  const { wallets, ready } = useSolanaWallets();
  const remembered = useRememberedSolanaWallet();
  const wallet = wallets.find(
    (item) => remembered && isSupportedSolanaWalletName(remembered.name) && item.address === remembered.address
  );

  return {
    ready,
    address: wallet?.address,
    wallet,
    hasRemembered: Boolean(remembered && isSupportedSolanaWalletName(remembered.name)),
  };
}

export function SolanaWalletSession() {
  const { isSolana } = useChainId();
  const { ready, wallets } = useSolanaWallets();
  const { wallets: evmWallets } = useEvmWallets();
  const { address: evmAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const remembered = useRememberedSolanaWallet();
  const wasSolanaRef = useRef<boolean | null>(null);
  const switchPendingRef = useRef(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    const previous = wasSolanaRef.current;
    wasSolanaRef.current = isSolana;

    if (!isSolana) {
      switchPendingRef.current = false;
      promptedRef.current = false;
      return;
    }

    if (previous === false) {
      switchPendingRef.current = true;
      promptedRef.current = false;
    }

    if (!ready) return;

    const evmWallet = evmWallets.find((wallet) => wallet.address.toLowerCase() === evmAddress?.toLowerCase());
    const action = decideSolanaSession({
      connected: wallets.map((wallet) => ({
        address: wallet.address,
        name: wallet.standardWallet.name,
      })),
      remembered,
      evmWalletClientType: evmWallet?.walletClientType,
      networkChanged: switchPendingRef.current,
    });

    switchPendingRef.current = false;

    if (action.type === "select") {
      rememberSolanaWallet(action.wallet);
      return;
    }

    if (action.type === "openConnect") {
      if (promptedRef.current) return;
      promptedRef.current = true;
      openConnectModal?.({ preSelectedWalletId: action.preSelectedWalletId });
    }
  }, [evmAddress, evmWallets, isSolana, openConnectModal, ready, remembered, wallets]);

  return null;
}
