import { ethers, JsonRpcProvider, Network, Signer } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { AnyChainId, AVALANCHE_FUJI } from "config/chains";
import { getFallbackRpcUrl, getWsRpcProviders } from "config/rpc";
import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import { getIsLargeAccountChain } from "domain/stats/isLargeAccount";
import { assertEvmRpcActive } from "lib/rpc/fetchRpc";
import { getCurrentExpressRpcUrl, getCurrentRpcUrls, useCurrentRpcUrls } from "lib/rpc/useRpcUrls";

export function getProvider(signer: undefined, chainId: number): ethers.JsonRpcProvider;
export function getProvider(signer: Signer, chainId: number): Signer;
export function getProvider(signer: Signer | undefined, chainId: number): ethers.JsonRpcProvider | Signer;
export function getProvider(signer: Signer | undefined, chainId: number): ethers.JsonRpcProvider | Signer {
  let url;

  if (signer) {
    return signer;
  }

  assertEvmRpcActive();

  url = getCurrentRpcUrls(chainId).primary;

  const network = Network.from(chainId);

  return new ethers.JsonRpcProvider(url, chainId, { staticNetwork: network });
}

export function getWsUrl(chainId: AnyChainId): string | undefined {
  if (chainId === AVALANCHE_FUJI) {
    return undefined;
  }

  const wsProviderConfig =
    getWsRpcProviders(chainId, getIsLargeAccountChain(chainId) ? "largeAccount" : "fallback")[0] ??
    getWsRpcProviders(chainId, "fallback")[0];

  if (wsProviderConfig) {
    return wsProviderConfig.url;
  }

  throw new Error(`Unsupported websocket URL for chain id: ${chainId}`);
}

export function getFallbackProvider(chainId: number) {
  if (getIsSolanaNetworkSelected()) {
    return;
  }

  const providerUrl = getFallbackRpcUrl(chainId, getIsLargeAccountChain(chainId));

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
  const solanaSelected = getIsSolanaNetworkSelected();

  useEffect(() => {
    if (!chainId || !rpcUrl || solanaSelected) {
      setProvider(undefined);
      return;
    }

    let cancelled = false;
    const nextProvider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    nextProvider._start();
    nextProvider._waitUntilReady().then(() => {
      if (cancelled) {
        nextProvider.destroy();
        return;
      }
      setProvider(nextProvider);
    });

    // A provider that became active is not destroyed here: destroy() cancels in-flight requests, and a submit
    // can outlive its modal or an rpcUrl switch while it still holds this provider.
    return () => {
      cancelled = true;
    };
  }, [chainId, rpcUrl, solanaSelected]);

  return { provider };
}
