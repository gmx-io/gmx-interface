import { getAccount } from "@wagmi/core";

import { getWagmiConfig } from "./walletConfig";

export type WalletNames = {
  current: string | undefined | null;
  authorized: string[];
  error: boolean;
};

export async function getWalletNames(): Promise<WalletNames> {
  try {
    const walletNames = new Set<string>();

    for (const connector of getWagmiConfig().connectors) {
      const isAuthorized = await connector.isAuthorized();
      if (isAuthorized) {
        walletNames.add(connector.name);
      }
    }

    return { current: getAccount(getWagmiConfig()).connector?.name, authorized: [...walletNames], error: false };
  } catch (e) {
    return {
      current: null,
      authorized: [],
      error: true,
    };
  }
}

(window as any).getWalletNames = getWalletNames;
