import type { Config } from "wagmi";

import { PRIVY_APP_ID } from "./walletConfig";

export const PRIVY_EMBEDDED_WALLET_CONNECTOR_ID = "io.privy.wallet";
export const WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY = "recentConnectorId";

export function getPrivyEmbeddedWalletConnectorId(address: string) {
  return `${PRIVY_EMBEDDED_WALLET_CONNECTOR_ID}.${address}`;
}

export function getPrivyActiveWalletConnectionStorageKey(appId = PRIVY_APP_ID) {
  return `privy:${appId}:active-wallet-connection`;
}

export async function setRecentPrivyEmbeddedWalletConnector(config: Config, address: string) {
  const connectorId = getPrivyEmbeddedWalletConnectorId(address);

  await Promise.all([
    config.storage?.removeItem(`${PRIVY_EMBEDDED_WALLET_CONNECTOR_ID}.disconnected`),
    config.storage?.removeItem(`${connectorId}.disconnected`),
    config.storage?.setItem(WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY, connectorId),
  ]);

  return connectorId;
}

export async function clearPrivyWagmiConnectionStorage(config: Config) {
  await config.storage?.removeItem(WAGMI_RECENT_CONNECTOR_ID_STORAGE_KEY);
  localStorage.removeItem(getPrivyActiveWalletConnectionStorageKey());
}
