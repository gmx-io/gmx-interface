import { getAccount } from "@wagmi/core";
import { getRainbowKitConfig } from "./rainbowKitConfig";

export async function getWalletNames() {
  try {
    const walletNames = new Set<string>();

    for (const connector of getRainbowKitConfig().connectors) {
      const isAuthorized = await connector.isAuthorized();
      if (isAuthorized) {
        walletNames.add(connector.name);
      }
    }

    return { current: getAccount(getRainbowKitConfig()).connector?.name, authorized: [...walletNames] };
  } catch (e) {
    return {
      current: null,
      authorized: [],
      error: true,
    };
  }
}

(window as any).getWalletNames = getWalletNames;
