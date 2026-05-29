import type { ConnectedWallet } from "@privy-io/react-auth";

import { PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY } from "config/localStorage";

type ConnectIntent = "pending" | "external-wallet" | "embedded-wallet";

let connectIntent: ConnectIntent | null = null;
let disconnectInProgress = false;

export function markPrivyConnectStarted() {
  connectIntent = "pending";
  disconnectInProgress = false;
}

export function markPrivyConnectFailed() {
  connectIntent = null;
}

export function markPrivyConnectCompleted() {
  connectIntent = null;
}

export function markPrivyDisconnectStarted() {
  connectIntent = null;
  disconnectInProgress = true;
  clearStoredPrivyActiveWallet();
}

export function preferEmbeddedWalletForCurrentPrivyConnect() {
  connectIntent = "embedded-wallet";
}

export function preferExternalWalletForCurrentPrivyConnect() {
  if (connectIntent === "embedded-wallet") {
    return;
  }

  connectIntent = "external-wallet";
}

export function hasPrivyConnectIntent() {
  return connectIntent !== null;
}

export function isPrivyDisconnectInProgress() {
  return disconnectInProgress;
}

export function shouldUseEmbeddedWalletForCurrentPrivyConnect() {
  return connectIntent === "embedded-wallet";
}

export function shouldUseExternalWalletForCurrentPrivyConnect() {
  return connectIntent === "external-wallet";
}

export function isPrivyConnectIntentPending() {
  return connectIntent === "pending";
}

export function getStoredPrivyActiveWallet(wallets: ConnectedWallet[]) {
  const storedAddress = localStorage.getItem(PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY)?.toLowerCase();

  if (!storedAddress) {
    return undefined;
  }

  return wallets.find((wallet) => wallet.address.toLowerCase() === storedAddress);
}

export function storePrivyActiveWallet(wallet: ConnectedWallet | undefined) {
  if (!wallet) {
    return;
  }

  localStorage.setItem(PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY, wallet.address);
}

export function clearStoredPrivyActiveWallet() {
  localStorage.removeItem(PRIVY_ACTIVE_WALLET_ADDRESS_LOCAL_STORAGE_KEY);
}

export function resetPrivyWalletSelection() {
  connectIntent = null;
  disconnectInProgress = false;
}
