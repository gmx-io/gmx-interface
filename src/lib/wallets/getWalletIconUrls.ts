import type { WagmiConnectorInstance } from "@rainbow-me/rainbowkit/dist/wallets/Wallet";
import uniqBy from "lodash/uniqBy";
import { useEffect, useState } from "react";

import { getRainbowKitConfig } from "./rainbowKitConfig";

async function getWalletIconUrls(): Promise<string[]> {
  const uniqueConnectors = uniqBy(
    getRainbowKitConfig().connectors as WagmiConnectorInstance[],
    (connector) => connector.id
  );

  const someIconUrls = await Promise.all(
    uniqueConnectors.map(async (connector: WagmiConnectorInstance) => {
      if (typeof connector.rkDetails?.iconUrl === "function") {
        return await connector.rkDetails?.iconUrl();
      } else {
        return connector.rkDetails?.iconUrl;
      }
    })
  );

  const iconUrls = someIconUrls.filter((url) => !!url) as string[];

  return iconUrls;
}

export function useWalletIconUrls(): string[] | undefined {
  const [walletIconUrls, setWalletIconUrls] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    getWalletIconUrls().then(setWalletIconUrls);
  }, []);

  return walletIconUrls;
}
