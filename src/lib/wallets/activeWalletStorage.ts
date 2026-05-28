import type { ConnectedWallet, User } from "@privy-io/react-auth";

import { ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";
import { Storage } from "lib/storage/Storage";

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
type ActivePrivyWalletStorageState = ActivePrivyWalletStorageValue & Record<string, string | undefined>;

const ACTIVE_PRIVY_WALLET_STORAGE_KEYS = ["address", "connectorType", "walletClientType"] as const;

function getActivePrivyWalletStorage() {
  return new Storage<ActivePrivyWalletStorageState>(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY);
}

function isActivePrivyWalletStorageValue(value: unknown): value is ActivePrivyWalletStorageValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const wallet = value as ActivePrivyWalletStorageValue;

  return (
    ACTIVE_PRIVY_WALLET_STORAGE_KEYS.every((key) => wallet[key] === undefined || typeof wallet[key] === "string") &&
    ACTIVE_PRIVY_WALLET_STORAGE_KEYS.some((key) => wallet[key])
  );
}

export function readActivePrivyWalletFromStorage() {
  const value = getActivePrivyWalletStorage().getState();
  return isActivePrivyWalletStorageValue(value) ? value : undefined;
}

export function writeActivePrivyWalletToStorage(wallet: ActivePrivyWalletStorageValue) {
  if (!isActivePrivyWalletStorageValue(wallet)) {
    return;
  }

  const storage = getActivePrivyWalletStorage();

  ACTIVE_PRIVY_WALLET_STORAGE_KEYS.forEach((key) => storage.set(key, wallet[key]));
}

export function removeActivePrivyWalletFromStorage() {
  getActivePrivyWalletStorage().clear();
}

function matchesStoredWallet(wallet: ConnectedWallet, storedWallet: ActivePrivyWalletStorageValue) {
  if (storedWallet.address && wallet.address !== storedWallet.address) {
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

export function findStoredActivePrivyWallet(wallets: ConnectedWallet[]) {
  const storedWallet = readActivePrivyWalletFromStorage();

  if (!storedWallet) {
    return undefined;
  }

  return wallets.find((wallet) => wallet.linked && matchesStoredWallet(wallet, storedWallet));
}

export function getEthereumWalletStorageValue(account: WalletAccount | null | undefined) {
  if (!account || account.type !== "wallet" || account.chainType !== "ethereum") {
    return undefined;
  }

  return {
    address: account.address,
    connectorType: account.connectorType ?? undefined,
    walletClientType: account.walletClientType ?? undefined,
  };
}

export function isEmbeddedEthereumWallet(account: WalletAccount) {
  return (
    Boolean(getEthereumWalletStorageValue(account)) &&
    (account.walletClientType === "privy" ||
      account.walletClientType === "privy-v2" ||
      account.connectorType === "embedded")
  );
}

export function getEmbeddedEthereumWallet(user: User) {
  return getEthereumWalletStorageValue(user.linkedAccounts.find(isEmbeddedEthereumWallet));
}
