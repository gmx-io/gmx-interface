import uniqBy from "lodash/uniqBy";
import { useEffect, useState } from "react";

import { getWagmiConfig } from "./walletConfig";

async function getWalletIconUrls(): Promise<string[]> {
  const uniqueConnectors = uniqBy(getWagmiConfig().connectors, (connector) => connector.id);

  const iconUrls = uniqueConnectors.map((connector) => connector.icon).filter((url): url is string => !!url);

  return iconUrls;
}

export function useWalletIconUrls(): string[] | undefined {
  const [walletIconUrls, setWalletIconUrls] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    getWalletIconUrls().then(setWalletIconUrls);
  }, []);

  return walletIconUrls;
}
