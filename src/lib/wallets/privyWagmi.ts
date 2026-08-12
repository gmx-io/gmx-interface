import type { ConnectedWallet } from "@privy-io/react-auth";
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
