import type { ConnectedWallet } from "@privy-io/react-auth";
import { type Address, isAddressEqual } from "viem";
import type { Config } from "wagmi";

import { getWagmiConfig } from "./walletConfig";

type PrivyWagmiWallet = Pick<ConnectedWallet, "address" | "meta" | "walletClientType">;

const KNOWN_EOA_WALLET_CLIENT_TYPES = new Set([
  "privy",
  "metamask",
  "phantom",
  "brave_wallet",
  "rainbow",
  "uniswap_wallet_extension",
  "uniswap_extension",
  "rabby_wallet",
  "bybit_wallet",
  "ronin_wallet",
  "haha_wallet",
  "crypto.com_wallet_extension",
  "crypto.com_onchain",
  "binance",
  "binanceus",
  "bitget_wallet",
  "coinbase_wallet",
  "zerion",
  "cryptocom",
  "uniswap",
  "okx_wallet",
  "solflare",
  "backpack",
  "jupiter",
  "kraken_wallet",
  "robinhood_wallet",
]);

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

export function getIsSmartWalletClient(walletClientType: string | undefined): boolean {
  return walletClientType !== undefined && !KNOWN_EOA_WALLET_CLIENT_TYPES.has(walletClientType);
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
