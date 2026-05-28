import type { ConnectedWallet, User, Wallet } from "@privy-io/react-auth";

import { ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";

type ActivePrivyWallet = Pick<Wallet, "address" | "connectorType" | "walletClientType">;
type WalletAccount = {
  address?: string;
  chainType?: string;
  connectorType?: string | null;
  type?: string;
  walletClientType?: string | null;
};

export type ActivePrivyWalletStorageValue = {
  address?: string;
  connectorType?: string;
  walletClientType?: string;
};

export function getActivePrivyWalletStorageKey(userId: string) {
  return `${ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY}:${userId}`;
}

function getStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function normalizeAddress(address: string | undefined) {
  return address?.toLowerCase();
}

function isActivePrivyWalletStorageValue(value: unknown): value is ActivePrivyWalletStorageValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const wallet = value as ActivePrivyWalletStorageValue;

  return (
    (wallet.address === undefined || typeof wallet.address === "string") &&
    (wallet.connectorType === undefined || typeof wallet.connectorType === "string") &&
    (wallet.walletClientType === undefined || typeof wallet.walletClientType === "string") &&
    Boolean(wallet.address || wallet.connectorType || wallet.walletClientType)
  );
}

export function readActivePrivyWalletFromStorage(userId: string) {
  try {
    const rawValue = getStorage()?.getItem(getActivePrivyWalletStorageKey(userId));

    if (!rawValue) {
      return undefined;
    }

    const value = JSON.parse(rawValue);

    return isActivePrivyWalletStorageValue(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function writeActivePrivyWalletToStorage(userId: string | undefined, wallet: ActivePrivyWalletStorageValue) {
  if (!userId || !isActivePrivyWalletStorageValue(wallet)) {
    return;
  }

  const value: ActivePrivyWalletStorageValue = {
    address: normalizeAddress(wallet.address),
    connectorType: wallet.connectorType,
    walletClientType: wallet.walletClientType,
  };

  try {
    getStorage()?.setItem(getActivePrivyWalletStorageKey(userId), JSON.stringify(value));
  } catch {
    // localStorage can be unavailable in privacy modes; wallet selection still has a fallback.
  }
}

export function removeActivePrivyWalletFromStorage(userId: string | undefined) {
  if (!userId) {
    return;
  }

  try {
    getStorage()?.removeItem(getActivePrivyWalletStorageKey(userId));
  } catch {
    // localStorage can be unavailable in privacy modes.
  }
}

function matchesStoredWallet(wallet: ConnectedWallet, storedWallet: ActivePrivyWalletStorageValue) {
  if (storedWallet.address && normalizeAddress(wallet.address) !== normalizeAddress(storedWallet.address)) {
    return false;
  }

  if (storedWallet.connectorType && wallet.connectorType !== storedWallet.connectorType) {
    return false;
  }

  if (storedWallet.walletClientType && wallet.walletClientType !== storedWallet.walletClientType) {
    return false;
  }

  return true;
}

export function findStoredActivePrivyWallet({ wallets, userId }: { wallets: ConnectedWallet[]; userId: string }) {
  const storedWallet = readActivePrivyWalletFromStorage(userId);

  if (!storedWallet) {
    return undefined;
  }

  return wallets.find((wallet) => wallet.linked && matchesStoredWallet(wallet, storedWallet));
}

export function isEmbeddedEthereumWallet(account: WalletAccount) {
  return (
    account.type === "wallet" &&
    account.chainType === "ethereum" &&
    (account.walletClientType === "privy" ||
      account.walletClientType === "privy-v2" ||
      account.connectorType === "embedded")
  );
}

export function getEmbeddedEthereumWallet(user: User) {
  const embeddedWallet = user.linkedAccounts.find(isEmbeddedEthereumWallet) as ActivePrivyWallet | undefined;

  if (!embeddedWallet) {
    return undefined;
  }

  return {
    address: embeddedWallet.address,
    connectorType: embeddedWallet.connectorType,
    walletClientType: embeddedWallet.walletClientType,
  };
}
