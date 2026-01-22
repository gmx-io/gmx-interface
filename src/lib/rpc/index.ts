import { ethers, JsonRpcProvider, Network, Signer } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { AnyChainId, AVALANCHE_FUJI } from "config/chains";
import { getFallbackRpcUrl, getWsRpcProviders } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { getCurrentExpressRpcUrl, getCurrentRpcUrls, useCurrentRpcUrls } from "lib/rpc/useRpcUrls";

export function getProvider(signer: undefined, chainId: number): ethers.JsonRpcProvider;
export function getProvider(signer: Signer, chainId: number): Signer;
export function getProvider(signer: Signer | undefined, chainId: number): ethers.JsonRpcProvider | Signer;
export function getProvider(signer: Signer | undefined, chainId: number): ethers.JsonRpcProvider | Signer {
  let url;

  if (signer) {
    return signer;
  }

  url = getCurrentRpcUrls(chainId).primary;

  const network = Network.from(chainId);

  return new ethers.JsonRpcProvider(url, chainId, { staticNetwork: network });
}

export function getWsUrl(chainId: AnyChainId): string | undefined {
  if (chainId === AVALANCHE_FUJI) {
    return undefined;
  }

  const wsProviderConfig =
    getWsRpcProviders(chainId, getIsLargeAccount() ? "largeAccount" : "fallback")[0] ??
    getWsRpcProviders(chainId, "fallback")[0];

  if (wsProviderConfig) {
    return wsProviderConfig.url;
  }

  throw new Error(`Unsupported websocket URL for chain id: ${chainId}`);
}

export function getFallbackProvider(chainId: number) {
  const providerUrl = getFallbackRpcUrl(chainId, getIsLargeAccount());

  if (!providerUrl) {
    return;
  }

  return new ethers.JsonRpcProvider(providerUrl, chainId, {
    staticNetwork: Network.from(chainId),
  });
}

export function useJsonRpcProvider(chainId: number | undefined, { isExpress = false }: { isExpress?: boolean } = {}) {
  const [provider, setProvider] = useState<JsonRpcProvider>();

  const { primary } = useCurrentRpcUrls(chainId as AnyChainId);
  const rpcUrl = useMemo(
    () => (isExpress && chainId ? getCurrentExpressRpcUrl(chainId) : primary),
    [chainId, isExpress, primary]
  );

  useEffect(() => {
    if (!chainId) {
      return;
    }

    async function initializeProvider() {
      if (!rpcUrl) return;

      const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);

      provider._start();
      await provider._waitUntilReady();

      setProvider(provider);
    }

    initializeProvider();
  }, [chainId, rpcUrl]);

  return { provider };
}
