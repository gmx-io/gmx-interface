import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { isAddress, isAddressEqual } from "viem";

import { ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";
import { Storage } from "lib/storage/Storage";

type WalletAccount = {
  address?: string;
  chainType?: string;
  connectorType?: string | null;
  meta?: {
    id?: string;
  };
  type?: string;
  walletClientType?: string | null;
};

type WagmiAccount = {
  address?: string;
  connectorId?: string;
};

export type ActivePrivyWalletStorageValue = {
  address: string;
  connectorId?: string;
  connectorType?: string;
  walletClientType?: string;
};
type ActivePrivyWalletStorageState = ActivePrivyWalletStorageValue & Record<string, string | undefined>;

const ACTIVE_PRIVY_WALLET_STORAGE_KEYS = ["address", "connectorId", "connectorType", "walletClientType"] as const;
const ACTIVE_PRIVY_WALLET_STORAGE_CHANGE_EVENT = "gmx:active-privy-wallet-storage-change";

function areAddressesEqual(addressA: string | undefined, addressB: string | undefined) {
  return Boolean(
    addressA && addressB && isAddress(addressA) && isAddress(addressB) && isAddressEqual(addressA, addressB)
  );
}

function getActivePrivyWalletStorage() {
  return new Storage<ActivePrivyWalletStorageState>(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY);
}

function notifyActivePrivyWalletStorageChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ACTIVE_PRIVY_WALLET_STORAGE_CHANGE_EVENT));
}

function isActivePrivyWalletStorageValue(value: unknown): value is ActivePrivyWalletStorageValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const wallet = value as ActivePrivyWalletStorageValue;

  return (
    typeof wallet.address === "string" &&
    ACTIVE_PRIVY_WALLET_STORAGE_KEYS.every((key) => wallet[key] === undefined || typeof wallet[key] === "string") &&
    Boolean(wallet.address)
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
  notifyActivePrivyWalletStorageChange();
}

export function removeActivePrivyWalletFromStorage() {
  getActivePrivyWalletStorage().clear();
  notifyActivePrivyWalletStorageChange();
}

export function subscribeActivePrivyWalletStorage(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(ACTIVE_PRIVY_WALLET_STORAGE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(ACTIVE_PRIVY_WALLET_STORAGE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function getPrivyWagmiConnectorId(wallet: Pick<ConnectedWallet, "address" | "meta" | "walletClientType">) {
  return wallet.walletClientType === "privy" ? `${wallet.meta.id}.${wallet.address}` : wallet.meta.id;
}

function matchesStoredWallet(wallet: ConnectedWallet, storedWallet: ActivePrivyWalletStorageValue) {
  if (!areAddressesEqual(wallet.address, storedWallet.address)) {
    return false;
  }

  if (storedWallet.connectorId && getPrivyWagmiConnectorId(wallet) !== storedWallet.connectorId) {
    return false;
  }

  if (!storedWallet.connectorId && storedWallet.connectorType && wallet.connectorType !== storedWallet.connectorType) {
    return false;
  }

  if (
    !storedWallet.connectorId &&
    storedWallet.walletClientType &&
    wallet.walletClientType !== storedWallet.walletClientType
  ) {
    return false;
  }

  return true;
}

export function findStoredActivePrivyWallet(wallets: ConnectedWallet[]) {
  const storedWallet = readActivePrivyWalletFromStorage();

  if (!storedWallet) {
    return undefined;
  }

  return findActivePrivyWalletByStorageValue(wallets, storedWallet);
}

export function findActivePrivyWalletByStorageValue(
  wallets: ConnectedWallet[],
  storedWallet: ActivePrivyWalletStorageValue
) {
  return wallets.find((wallet) => matchesStoredWallet(wallet, storedWallet));
}

export function findActivePrivyWalletByWagmiAccount(wallets: ConnectedWallet[], account: WagmiAccount) {
  if (!account.address) {
    return undefined;
  }

  const addressMatch = wallets.filter((wallet) => areAddressesEqual(wallet.address, account.address));

  if (!account.connectorId) {
    return addressMatch[0];
  }

  return addressMatch.find((wallet) => getPrivyWagmiConnectorId(wallet) === account.connectorId) ?? addressMatch[0];
}

export function getEthereumWalletStorageValue(account: WalletAccount | null | undefined) {
  if (!account) {
    return undefined;
  }

  const isConnectedEthereumWallet = account.type === "ethereum";
  const isEthereumLinkedWallet = account.type === "wallet" && account.chainType === "ethereum";
  const isEthereumWallet = !account.type && account.chainType === "ethereum";

  if (!isConnectedEthereumWallet && !isEthereumLinkedWallet && !isEthereumWallet) {
    return undefined;
  }

  if (!account.address) {
    return undefined;
  }

  return {
    address: account.address,
    connectorId: account.meta?.id
      ? account.walletClientType === "privy"
        ? `${account.meta.id}.${account.address}`
        : account.meta.id
      : undefined,
    connectorType: account.connectorType ?? undefined,
    walletClientType: account.walletClientType ?? undefined,
  };
}

export function isWagmiAccountActivePrivyWallet(account: WagmiAccount, storedWallet: ActivePrivyWalletStorageValue) {
  if (!account.address) {
    return false;
  }

  if (!areAddressesEqual(account.address, storedWallet.address)) {
    return false;
  }

  return !storedWallet.connectorId || account.connectorId === storedWallet.connectorId;
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
