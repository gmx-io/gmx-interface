import {
  getEmbeddedConnectedWallet,
  type BaseConnectedWalletType,
  type ConnectedWallet,
  type User,
} from "@privy-io/react-auth";
import type { Config } from "wagmi";

import { PRIVY_APP_ID } from "./walletConfig";

export const PRIVY_EMBEDDED_WALLET_CONNECTOR_ID = "io.privy.wallet";
export const WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY = "recentConnectorId";

let explicitPrivyWagmiConnectorId: string | null = null;
let shouldPreferEmbeddedWalletForNextUser = false;

export function getPrivyEmbeddedWalletConnectorId(address: string) {
  return `${PRIVY_EMBEDDED_WALLET_CONNECTOR_ID}.${address}`;
}

export function getPrivyActiveWalletConnectionStorageKey(appId = PRIVY_APP_ID) {
  return `privy:${appId}:active-wallet-connection`;
}

export function getPrivyWagmiConnectorId(
  wallet: Pick<BaseConnectedWalletType, "address" | "meta" | "walletClientType">
) {
  return wallet.walletClientType === "privy" ? getPrivyEmbeddedWalletConnectorId(wallet.address) : wallet.meta.id;
}

export function markExplicitPrivyWagmiConnector(connectorId: string) {
  explicitPrivyWagmiConnectorId = connectorId;
  shouldPreferEmbeddedWalletForNextUser = false;
}

export function preferEmbeddedWalletForNextPrivyUser() {
  explicitPrivyWagmiConnectorId = null;
  shouldPreferEmbeddedWalletForNextUser = true;
}

export function resetPrivyWagmiConnectionSelection() {
  explicitPrivyWagmiConnectorId = null;
  shouldPreferEmbeddedWalletForNextUser = false;
}

function isPrivyEmbeddedWallet(wallet: ConnectedWallet) {
  return (
    wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2" || wallet.connectorType === "embedded"
  );
}

function getStoredRecentConnectorId() {
  const serializedConnectorId = localStorage.getItem("wagmi.recentConnectorId");

  if (!serializedConnectorId) {
    return null;
  }

  try {
    return JSON.parse(serializedConnectorId) as string;
  } catch {
    return null;
  }
}

function findWalletByConnectorId(wallets: ConnectedWallet[], connectorId: string | null) {
  if (!connectorId) {
    return undefined;
  }

  return wallets.find((wallet) => getPrivyWagmiConnectorId(wallet) === connectorId);
}

export function getActiveWalletForPrivyWagmi({ wallets, user }: { wallets: ConnectedWallet[]; user: User | null }) {
  const explicitWallet = findWalletByConnectorId(wallets, explicitPrivyWagmiConnectorId);

  if (explicitWallet) {
    return explicitWallet;
  }

  if (!user) {
    return undefined;
  }

  if (shouldPreferEmbeddedWalletForNextUser) {
    const embeddedWallet = getEmbeddedConnectedWallet(wallets) ?? wallets.find(isPrivyEmbeddedWallet);

    if (!embeddedWallet) {
      return undefined;
    }

    markExplicitPrivyWagmiConnector(getPrivyWagmiConnectorId(embeddedWallet));
    return embeddedWallet;
  }

  return findWalletByConnectorId(wallets, getStoredRecentConnectorId()) ?? wallets[0];
}

export async function setRecentPrivyWagmiConnector(config: Config, connectorId: string) {
  await Promise.all([
    config.storage?.removeItem(`${connectorId}.disconnected`),
    config.storage?.setItem(WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY, connectorId),
  ]);

  return connectorId;
}

export async function setRecentPrivyEmbeddedWalletConnector(config: Config, address: string) {
  const connectorId = getPrivyEmbeddedWalletConnectorId(address);

  await Promise.all([
    config.storage?.removeItem(`${PRIVY_EMBEDDED_WALLET_CONNECTOR_ID}.disconnected`),
    setRecentPrivyWagmiConnector(config, connectorId),
  ]);

  return connectorId;
}

export async function clearPrivyWagmiConnectionStorage(config: Config) {
  resetPrivyWagmiConnectionSelection();
  await config.storage?.removeItem(WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY);
  localStorage.removeItem(getPrivyActiveWalletConnectionStorageKey());
}
