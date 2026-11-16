import type { ConnectedWallet } from "@privy-io/react-auth";
import { switchAccount } from "@wagmi/core";
import type { Config } from "wagmi";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { SOLANA_LINKED_EVM_CONNECTORS_LOCAL_STORAGE_KEY } from "config/localStorage";
import { Storage } from "lib/storage/Storage";

import { getWagmiConfig } from "./walletConfig";

// Flag off, a user who never stored this key gets no write. Once the key exists, picks and
// disconnects keep it current, including a later flag-off session.
export function shouldUpdateSolanaLinkedEvmConnectors() {
  return (
    getIsSolanaNetworkEnabled() ||
    Object.keys(new Storage<Record<string, unknown>>(SOLANA_LINKED_EVM_CONNECTORS_LOCAL_STORAGE_KEY).getState())
      .length > 0
  );
}

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
  if (shouldUpdateSolanaLinkedEvmConnectors()) {
    const { forgetPickedEvmConnectors } = await import("./solanaLinkedEvmConnectors");
    forgetPickedEvmConnectors(connectorIds);
  }

  await Promise.allSettled([
    storage.removeItem("recentConnectorId"),
    ...connectorIds.map((connectorId) => storage.setItem(`${connectorId}.disconnected`, true)),
  ]);
}

async function getRecentConnectorId(config: Config): Promise<string | undefined> {
  return (await config.storage?.getItem("recentConnectorId")) ?? undefined;
}

// @privy-io/wagmi writes every connected wallet, Solana ones included, into recentConnectorId and
// reconnects before this runs. reconnect() reads that key, so restoring it does not put the current
// account back; switchAccount does, once reconnect has left connecting/reconnecting.
const RECONNECT_START_MS = 250;

export type EvmSessionSnapshot = {
  connectorId: string | undefined;
  recentConnectorId: Promise<string | undefined>;
  // EVM connections already up when the Solana modal opened; a Solana connect must not drop them.
  connectedConnectorIds: string[];
};

export function captureEvmSession(config: Config = getWagmiConfig()): EvmSessionSnapshot {
  const currentConnection = config.state.current ? config.state.connections.get(config.state.current) : undefined;

  return {
    connectorId: currentConnection?.connector.id,
    recentConnectorId: getRecentConnectorId(config),
    connectedConnectorIds: Array.from(config.state.connections.values()).map((connection) => connection.connector.id),
  };
}

export async function restoreEvmSessionAfterSolanaConnect(
  snapshot: EvmSessionSnapshot,
  config: Config = getWagmiConfig()
) {
  await waitForWagmiReconnect(config);

  const connection = snapshot.connectorId
    ? Array.from(config.state.connections.values()).find((item) => item.connector.id === snapshot.connectorId)
    : undefined;

  if (connection) {
    await switchAccount(config, { connector: connection.connector });
    return;
  }

  await restoreRecentConnectorId(await snapshot.recentConnectorId, config);
}

function isWagmiReconnectStatus(status: Config["state"]["status"]) {
  return status === "connecting" || status === "reconnecting";
}

function waitForWagmiReconnect(config: Config): Promise<void> {
  return new Promise((resolve) => {
    let unsubscribe: (() => void) | undefined;
    let startTimer = 0;
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(startTimer);
      unsubscribe?.();
      resolve();
    };

    const watchUntilIdle = () => {
      if (!isWagmiReconnectStatus(config.state.status)) {
        finish();
        return;
      }

      unsubscribe = config.subscribe(
        (state) => state.status,
        (status) => {
          if (!isWagmiReconnectStatus(status)) {
            finish();
          }
        }
      );
    };

    if (isWagmiReconnectStatus(config.state.status)) {
      watchUntilIdle();
      return;
    }

    unsubscribe = config.subscribe(
      (state) => state.status,
      (status) => {
        if (!isWagmiReconnectStatus(status)) {
          return;
        }
        window.clearTimeout(startTimer);
        unsubscribe?.();
        watchUntilIdle();
      }
    );
    startTimer = window.setTimeout(finish, RECONNECT_START_MS);
  });
}

export async function restoreRecentConnectorId(
  recentConnectorId: string | undefined,
  config: Config = getWagmiConfig()
) {
  const storage = config.storage;

  if (!storage) {
    return;
  }

  if (recentConnectorId === undefined) {
    await storage.removeItem("recentConnectorId");
  } else {
    await storage.setItem("recentConnectorId", recentConnectorId);
  }
}
