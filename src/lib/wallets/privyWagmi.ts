import type { ConnectedWallet } from "@privy-io/react-auth";
import { disconnect, getAccount, reconnect, switchAccount } from "@wagmi/core";
import type { Config } from "wagmi";

import { getWagmiConfig } from "./walletConfig";

type PrivyWagmiWallet = Pick<ConnectedWallet, "address" | "meta" | "walletClientType">;

export function getPrivyWagmiConnectorId(wallet: PrivyWagmiWallet): string {
  return wallet.walletClientType === "privy" ? `${wallet.meta.id}.${wallet.address}` : wallet.meta.id;
}

export async function disconnectPrivyWalletsFromWagmi(wallets: PrivyWagmiWallet[], config: Config = getWagmiConfig()) {
  const storage = config.storage;

  if (!storage) {
    return;
  }

  const connectorIds = Array.from(new Set(wallets.map(getPrivyWagmiConnectorId)));

  await Promise.allSettled([
    storage.removeItem("recentConnectorId"),
    ...connectorIds.map((connectorId) => storage.setItem(`${connectorId}.disconnected`, true)),
  ]);
}

const RECENT_CONNECTOR_ID_KEY = "recentConnectorId";

export function captureEvmConnectorId(config: Config = getWagmiConfig()): string | null {
  return getAccount(config).connector?.id ?? null;
}

// Privy's wagmi sync writes recentConnectorId from the wallet that just connected, then
// reconnects. A Solana Phantom connect uses the same extension id and becomes the current
// EVM connector. Put the previous EVM connector back.
// ponytail: 8×50ms, Privy reconnect holds isReconnecting until providers resolve
export function scheduleKeepEvmConnector(connectorId: string | null, config: Config = getWagmiConfig()) {
  let attempts = 0;
  const run = () => {
    attempts += 1;
    void keepEvmConnector(connectorId, config).then((done) => {
      if (!done && attempts < 8) setTimeout(run, 50);
    });
  };
  run();
}

export async function keepEvmConnector(connectorId: string | null, config: Config = getWagmiConfig()): Promise<boolean> {
  const storage = config.storage;
  if (connectorId) await storage?.setItem(RECENT_CONNECTOR_ID_KEY, connectorId);
  else await storage?.removeItem(RECENT_CONNECTOR_ID_KEY);

  const account = getAccount(config);
  if ((account.connector?.id ?? null) === connectorId) return true;
  if (account.status === "connecting" || account.status === "reconnecting") return false;

  if (connectorId) {
    const connection = [...config.state.connections.values()].find(
      (item) => item.connector.id === connectorId
    );
    if (connection) {
      await switchAccount(config, { connector: connection.connector });
      return true;
    }

    await reconnect(config);
    return (getAccount(config).connector?.id ?? null) === connectorId;
  }

  if (!account.isConnected) return true;
  await disconnect(config);
  return !getAccount(config).isConnected;
}
