import { getAccount } from "@wagmi/core";
import { rainbowKitConfig } from "./rainbowKitConfig";

export async function getWalletNames() {
  try {
    const walletNames = new Set<string>();

    for (const connector of rainbowKitConfig.connectors) {
      const isAuthorized = await connector.isAuthorized();
      if (isAuthorized) {
        walletNames.add(connector.name);
      }
    }

    return { current: getAccount(rainbowKitConfig).connector?.name, authorized: [...walletNames] };
  } catch (e) {
    return {
      current: null,
      authorized: [],
      error: true,
    };
  }
}

(window as any).getWalletNames = getWalletNames;
