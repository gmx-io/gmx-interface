import type { ConnectedWallet } from "@privy-io/react-auth";
import { type Address, isAddressEqual } from "viem";
import type { Config } from "wagmi";

import { getWagmiConfig } from "./walletConfig";

type PrivyWagmiWallet = Pick<ConnectedWallet, "address" | "meta" | "walletClientType">;

export function getPrivyWagmiConnectorId(wallet: PrivyWagmiWallet): string {
  return wallet.walletClientType === "privy" ? `${wallet.meta.id}.${wallet.address}` : wallet.meta.id;
}

export function getConnectedPrivyWallet(
  wallets: PrivyWagmiWallet[],
  address: Address | undefined,
  connectorId: string | undefined
): PrivyWagmiWallet | undefined {
  return wallets.find(
    (wallet) =>
      address !== undefined &&
      isAddressEqual(wallet.address as Address, address) &&
      (!connectorId || getPrivyWagmiConnectorId(wallet) === connectorId)
  );
}

export function getIsKnownSmartWalletClient(walletClientType: string | undefined): boolean {
  return (
    walletClientType === "safe" || walletClientType === "base_account" || walletClientType === "coinbase_smart_wallet"
  );
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
