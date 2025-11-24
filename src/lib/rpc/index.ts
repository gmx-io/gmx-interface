import { ethers, JsonRpcProvider, Network, Signer, WebSocketProvider } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { AnyChainId, AVALANCHE_FUJI } from "config/chains";
import { isDevelopment } from "config/env";
import { getExpressRpcUrl, getFallbackRpcUrl, getWsRpcProviders } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { getCurrentRpcUrls, useCurrentRpcUrls } from "lib/rpc/bestRpcTracker";

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

export function getWsProvider(chainId: AnyChainId): WebSocketProvider | JsonRpcProvider {
  const network = Network.from(chainId);
  const wsProviderConfig = getWsRpcProviders(chainId, getIsLargeAccount() ? "largeAccount" : "fallback")[0];

  if (wsProviderConfig) {
    return new ethers.WebSocketProvider(wsProviderConfig.url, network, { staticNetwork: network });
  }

  if (chainId === AVALANCHE_FUJI) {
    const provider = new ethers.JsonRpcProvider(getCurrentRpcUrls(AVALANCHE_FUJI).primary, network, {
      staticNetwork: network,
    });
    provider.pollingInterval = 2000;
    return provider;
  }

  throw new Error(`Unsupported websocket provider for chain id: ${chainId}`);
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

export function getExpressProvider(chainId: number): JsonRpcProvider | undefined {
  const providerUrl: string | undefined = getExpressRpcUrl(chainId);

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
    () => (isExpress && chainId ? getExpressRpcUrl(chainId) : primary),
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

export function isWebsocketProvider(provider: any): provider is WebSocketProvider {
  return Boolean(provider?.websocket);
}

export enum WSReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

const readyStateByEnum = {
  [WSReadyState.CONNECTING]: "connecting",
  [WSReadyState.OPEN]: "open",
  [WSReadyState.CLOSING]: "closing",
  [WSReadyState.CLOSED]: "closed",
};

export function isProviderInClosedState(wsProvider: WebSocketProvider) {
  return [WSReadyState.CLOSED, WSReadyState.CLOSING].includes(wsProvider.websocket.readyState);
}

export function closeWsConnection(wsProvider: WebSocketProvider) {
  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log(
      "closing ws connection, state =",
      readyStateByEnum[wsProvider.websocket.readyState] ?? wsProvider.websocket.readyState
    );
  }

  if (isProviderInClosedState(wsProvider)) {
    return;
  }

  wsProvider.removeAllListeners();
  wsProvider.websocket.close();
}
