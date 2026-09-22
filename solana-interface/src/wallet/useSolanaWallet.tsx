import { usePrivy, useWallets as useEvmWallets } from "@privy-io/react-auth";
import { useCreateWallet, useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { useChainId } from "lib/chains";

import {
  clearSuppressedSolanaWallet,
  decideSolanaSession,
  isSocialLogin,
  readRememberedSolanaWallet,
  readSuppressedSolanaWallet,
  rememberSolanaWallet,
  subscribeSolanaWalletStore,
} from "./solanaWalletSession";

function isEmbeddedSolanaWallet(wallet: ConnectedStandardSolanaWallet) {
  const name = wallet.standardWallet.name.toLowerCase();
  return name.includes("privy") || "privy:" in wallet.standardWallet.features;
}

export function useRememberedSolanaWallet() {
  return useSyncExternalStore(subscribeSolanaWalletStore, readRememberedSolanaWallet, readRememberedSolanaWallet);
}

export function useSuppressedSolanaWallet() {
  return useSyncExternalStore(subscribeSolanaWalletStore, readSuppressedSolanaWallet, readSuppressedSolanaWallet);
}

export function useSolanaWallet() {
  const { wallets, ready } = useSolanaWallets();
  const remembered = useRememberedSolanaWallet();
  const suppressedAddress = useSuppressedSolanaWallet();
  const wallet = wallets.find((item) => remembered && item.address === remembered.address && item.address !== suppressedAddress);

  return {
    ready,
    address: wallet?.address,
    wallet,
    hasRemembered: Boolean(remembered) && remembered?.address !== suppressedAddress,
  };
}

export function SolanaWalletSession() {
  const { isSolana } = useChainId();
  const { ready, wallets } = useSolanaWallets();
  const { user } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { address: evmAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { createWallet } = useCreateWallet();
  const remembered = useRememberedSolanaWallet();
  const suppressedAddress = useSuppressedSolanaWallet();
  const wasSolanaRef = useRef<boolean | null>(null);
  const seenUserRef = useRef(false);
  const wasSocialRef = useRef(false);
  const switchPendingRef = useRef(false);
  const promptedRef = useRef(false);
  const createdRef = useRef(false);
  const disconnectedRef = useRef(new Set<string>());
  const isSocial = isSocialLogin((user?.linkedAccounts ?? []).map((account) => account.type));

  useEffect(() => {
    const previous = wasSolanaRef.current;
    wasSolanaRef.current = isSolana;

    if (!isSolana) {
      switchPendingRef.current = false;
      promptedRef.current = false;
      createdRef.current = false;
      wasSocialRef.current = isSocial;
      seenUserRef.current = true;
      return;
    }

    if (previous === false) {
      switchPendingRef.current = true;
      promptedRef.current = false;
      createdRef.current = false;
    }

    if (seenUserRef.current && isSocial && !wasSocialRef.current) {
      switchPendingRef.current = true;
      promptedRef.current = false;
      createdRef.current = false;
    }
    seenUserRef.current = true;
    wasSocialRef.current = isSocial;

    if (!ready) return;

    const evmWallet = evmWallets.find((wallet) => wallet.address.toLowerCase() === evmAddress?.toLowerCase());
    const action = decideSolanaSession({
      connected: wallets.map((wallet) => ({
        address: wallet.address,
        name: wallet.standardWallet.name,
        embedded: isEmbeddedSolanaWallet(wallet),
      })),
      remembered,
      suppressedAddress,
      isSocial,
      evmWalletClientType: evmWallet?.walletClientType,
      networkChanged: switchPendingRef.current,
    });

    if (action.type === "disconnect") {
      if (!disconnectedRef.current.has(action.wallet.address)) {
        disconnectedRef.current.add(action.wallet.address);
        void wallets.find((wallet) => wallet.address === action.wallet.address)?.disconnect();
      }
      return;
    }

    switchPendingRef.current = false;

    if (action.type === "select") {
      rememberSolanaWallet(action.wallet);
      return;
    }

    if (action.type === "createEmbedded") {
      if (createdRef.current) return;
      createdRef.current = true;
      void createWallet()
        .then(({ wallet }) => {
          clearSuppressedSolanaWallet();
          rememberSolanaWallet({ address: wallet.address, name: "Privy" });
        })
        .catch(() => undefined);
      return;
    }

    if (action.type === "openConnect") {
      if (promptedRef.current) return;
      promptedRef.current = true;
      openConnectModal?.({ preSelectedWalletId: action.preSelectedWalletId });
    }
  }, [
    createWallet,
    evmAddress,
    evmWallets,
    isSocial,
    isSolana,
    openConnectModal,
    ready,
    remembered,
    suppressedAddress,
    wallets,
  ]);

  return null;
}
