import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getAlchemyArbitrumWsUrl, getRandomPrivateRpcUrl } from "config/chains";
import { isDevelopment } from "config/env";
import { JsonRpcProvider, Network, Signer, WebSocketProvider, ethers } from "ethers";
import { getCurrentRpcUrls, useCurrentRpcUrls } from "lib/rpc/bestRpcTracker";
import { useEffect, useState } from "react";

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

export function getWsProvider(chainId: number): WebSocketProvider | JsonRpcProvider | undefined {
  const network = Network.from(chainId);

  if (chainId === ARBITRUM) {
    return new ethers.WebSocketProvider(getAlchemyArbitrumWsUrl(), network, { staticNetwork: network });
  }

  if (chainId === AVALANCHE) {
    return new ethers.WebSocketProvider("wss://api.avax.network/ext/bc/C/ws", network, { staticNetwork: network });
  }

  if (chainId === AVALANCHE_FUJI) {
    const provider = new ethers.JsonRpcProvider(getCurrentRpcUrls(AVALANCHE_FUJI).primary, network, {
      staticNetwork: network,
    });
    provider.pollingInterval = 2000;
    return provider;
  }
}

export function getFallbackProvider(chainId: number) {
  const providerUrl = getRandomPrivateRpcUrl(chainId);

  if (!providerUrl) {
    return;
  }

  return new ethers.JsonRpcProvider(providerUrl, chainId, {
    staticNetwork: Network.from(chainId),
  });
}

export function useJsonRpcProvider(chainId: number) {
  const [provider, setProvider] = useState<JsonRpcProvider>();

  const { primary: primaryRpcUrl } = useCurrentRpcUrls(chainId);

  useEffect(() => {
    async function initializeProvider() {
      if (!primaryRpcUrl) return;

      const provider = new ethers.JsonRpcProvider(primaryRpcUrl, chainId);

      provider._start();
      await provider._waitUntilReady();

      setProvider(provider);
    }

    initializeProvider();
  }, [chainId, primaryRpcUrl]);

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
