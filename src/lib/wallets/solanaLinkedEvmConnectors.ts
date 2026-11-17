import { watchConnections } from "@wagmi/core";
import uniq from "lodash/uniq";
import type { Config } from "wagmi";

import { SOLANA_LINKED_EVM_CONNECTORS_LOCAL_STORAGE_KEY } from "config/localStorage";
import { Storage } from "lib/storage/Storage";

import { getWagmiConfig } from "./walletConfig";

// A Solana connect also authorizes the same extension's EVM provider (Phantom keeps one permission per site),
// so @privy-io/wagmi would silently connect an EVM account the user never picked, and switching to an EVM
// network would then ask that wallet to switch chains. These connectors stay out of wagmi until the user
// picks the wallet in the EVM flow.

type LinkedConnectorsState = {
  // EVM connectors of a connected Solana wallet's extension, kept out of wagmi.
  connectorIds: string[];
  // EVM connectors the user picked in the EVM connect flow.
  pickedConnectorIds: string[];
};

function getLinkedConnectorsStorage() {
  return new Storage<LinkedConnectorsState>(SOLANA_LINKED_EVM_CONNECTORS_LOCAL_STORAGE_KEY);
}

export function getSolanaLinkedEvmConnectorIds(): string[] {
  return getLinkedConnectorsStorage().get("connectorIds") ?? [];
}

type AnnounceProviderEvent = Event & { detail?: { info?: { name?: string; rdns?: string } } };

// Privy's EIP-6963 connectors use the provider rdns as the wagmi connector id.
export function getInjectedEvmConnectorIds(walletName: string, browserWindow: Window = window): string[] {
  const connectorIds: string[] = [];
  const name = walletName.toLowerCase();

  const handleAnnounce = (event: Event) => {
    const info = (event as AnnounceProviderEvent).detail?.info;
    if (info?.rdns && info.name?.toLowerCase() === name) {
      connectorIds.push(info.rdns);
    }
  };

  // Wallets answer requestProvider synchronously.
  browserWindow.addEventListener("eip6963:announceProvider", handleAnnounce);
  browserWindow.dispatchEvent(new Event("eip6963:requestProvider"));
  browserWindow.removeEventListener("eip6963:announceProvider", handleAnnounce);

  return uniq(connectorIds);
}

function removeConnections(config: Config, connectorIds: string[]) {
  const hasConnection = Array.from(config.state.connections.values()).some((connection) =>
    connectorIds.includes(connection.connector.id)
  );

  if (!hasConnection) {
    return;
  }

  // Not connector.disconnect(): the injected connector revokes the wallet permission, which also drops
  // the Solana connection of the same extension.
  config.setState((state) => {
    const connections = new Map(state.connections);
    for (const [uid, connection] of connections) {
      if (connectorIds.includes(connection.connector.id)) {
        connections.delete(uid);
      }
    }

    if (state.current && connections.has(state.current)) {
      return { ...state, connections };
    }

    const nextConnection = connections.values().next().value;

    return {
      ...state,
      connections,
      current: nextConnection?.connector.uid ?? null,
      status: nextConnection ? "connected" : "disconnected",
    };
  });
}

export async function detachSolanaLinkedEvmConnectors(
  walletName: string,
  config: Config = getWagmiConfig(),
  // EVM connections already up when the Solana modal opened. They have no picked record when wagmi
  // restored them on load, and a Solana connect must not drop them.
  keepConnectorIds: readonly string[] = []
) {
  const storage = getLinkedConnectorsStorage();
  const pickedConnectorIds = storage.get("pickedConnectorIds") ?? [];
  const connectorIds = getInjectedEvmConnectorIds(walletName).filter(
    (id) => !pickedConnectorIds.includes(id) && !keepConnectorIds.includes(id)
  );

  if (connectorIds.length === 0) {
    return;
  }

  storage.set("connectorIds", uniq([...(storage.get("connectorIds") ?? []), ...connectorIds]));

  removeConnections(config, connectorIds);

  // The injected connector's isAuthorized() reads this, so reconnect() skips it after a reload too.
  await Promise.all(connectorIds.map((connectorId) => config.storage?.setItem(`${connectorId}.disconnected`, true)));
}

export function rememberPickedEvmConnector(connectorId: string) {
  const storage = getLinkedConnectorsStorage();

  storage.set("pickedConnectorIds", uniq([...(storage.get("pickedConnectorIds") ?? []), connectorId]));
  storage.set(
    "connectorIds",
    (storage.get("connectorIds") ?? []).filter((id) => id !== connectorId)
  );
}

export function forgetPickedEvmConnectors(connectorIds: string[]) {
  const storage = getLinkedConnectorsStorage();

  storage.set(
    "pickedConnectorIds",
    (storage.get("pickedConnectorIds") ?? []).filter((id) => !connectorIds.includes(id))
  );
}

// An EVM accountsChanged event from the extension connects the connector even with the disconnected shim set.
export function watchSolanaLinkedEvmConnectors(config: Config = getWagmiConfig()): () => void {
  const removeLinkedConnections = () => {
    const connectorIds = getSolanaLinkedEvmConnectorIds();

    if (connectorIds.length > 0) {
      removeConnections(config, connectorIds);
    }
  };

  removeLinkedConnections();

  return watchConnections(config, { onChange: removeLinkedConnections });
}
