import type { BaseConnectedWalletType, ConnectedWallet, User } from "@privy-io/react-auth";
import type { Config } from "wagmi";

import { getWagmiConfig } from "./walletConfig";

const PRIVY_DISCONNECTED_WAGMI_CONNECTORS_KEY = "privy-disconnected-wagmi-connectors";

type PrivyWagmiWallet = Pick<BaseConnectedWalletType, "address" | "meta" | "type" | "walletClientType">;

type GetActiveWalletForWagmiArgs = {
  wallets: ConnectedWallet[];
  user: User | null;
};

function readDisconnectedConnectorIds() {
  if (typeof localStorage === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(PRIVY_DISCONNECTED_WAGMI_CONNECTORS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeDisconnectedConnectorIds(connectorIds: Set<string>) {
  if (typeof localStorage === "undefined") {
    return;
  }

  if (connectorIds.size === 0) {
    localStorage.removeItem(PRIVY_DISCONNECTED_WAGMI_CONNECTORS_KEY);
    return;
  }

  localStorage.setItem(PRIVY_DISCONNECTED_WAGMI_CONNECTORS_KEY, JSON.stringify(Array.from(connectorIds)));
}

function isWagmiConnectorMarkedDisconnected(connectorId: string, config: Config) {
  if (typeof localStorage === "undefined") {
    return false;
  }

  const storageKey = config.storage?.key ?? "wagmi";

  return localStorage.getItem(`${storageKey}.${connectorId}.disconnected`) === "true";
}

function isPrivyConnectorAllowed(connectorId: string, config: Config) {
  return !readDisconnectedConnectorIds().has(connectorId) && !isWagmiConnectorMarkedDisconnected(connectorId, config);
}

export function getPrivyWagmiConnectorId(wallet: PrivyWagmiWallet): string {
  return wallet.walletClientType === "privy" ? `${wallet.meta.id}.${wallet.address}` : wallet.meta.id;
}

export async function disconnectPrivyWalletsFromWagmi(wallets: PrivyWagmiWallet[], config: Config = getWagmiConfig()) {
  const storage = config.storage;
  const connectorIds = Array.from(
    new Set(wallets.filter((wallet) => wallet.type === "ethereum").map(getPrivyWagmiConnectorId))
  );
  const disconnectedConnectorIds = readDisconnectedConnectorIds();

  // Wagmi's injected shim can be cleared by provider events while Privy rebuilds connectors.
  // Keep an app-side block until the user explicitly selects the wallet again.
  connectorIds.forEach((connectorId) => disconnectedConnectorIds.add(connectorId));
  writeDisconnectedConnectorIds(disconnectedConnectorIds);

  if (!storage) {
    return;
  }

  await Promise.allSettled([
    storage.removeItem("recentConnectorId"),
    ...connectorIds.map((connectorId) => storage.setItem(`${connectorId}.disconnected`, true)),
  ]);
}

export async function allowPrivyWalletForWagmi(wallet: PrivyWagmiWallet, config: Config = getWagmiConfig()) {
  if (wallet.type !== "ethereum") {
    return;
  }

  const connectorId = getPrivyWagmiConnectorId(wallet);
  const disconnectedConnectorIds = readDisconnectedConnectorIds();

  disconnectedConnectorIds.delete(connectorId);
  writeDisconnectedConnectorIds(disconnectedConnectorIds);

  await Promise.allSettled([
    config.storage?.removeItem(`${connectorId}.disconnected`),
    config.storage?.setItem("recentConnectorId", connectorId),
  ]);
}

export function getActiveWalletForWagmi(
  { wallets, user }: GetActiveWalletForWagmiArgs,
  config: Config = getWagmiConfig()
) {
  if (!user) {
    return undefined;
  }

  // Returning undefined tells @privy-io/wagmi to reset wagmi instead of setting up stale wallets.
  return wallets
    .filter((wallet) => wallet.type === "ethereum")
    .filter((wallet) => isPrivyConnectorAllowed(getPrivyWagmiConnectorId(wallet), config))
    .sort((a, b) => b.connectedAt - a.connectedAt)[0];
}
