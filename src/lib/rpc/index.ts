import { JsonRpcProvider, Network, WebSocketProvider } from "ethers";
import {
  ARBITRUM,
  ARBITRUM_GOERLI,
  AVALANCHE,
  AVALANCHE_FUJI,
  FALLBACK_PROVIDERS,
  getAlchemyWsUrl,
  getFallbackRpcUrl,
  getRpcUrl,
} from "config/chains";
import { Signer, ethers } from "ethers";
import { useEffect, useState } from "react";

export function getProvider(signer: undefined, chainId: number): ethers.JsonRpcProvider;
export function getProvider(signer: Signer, chainId: number): Signer;
export function getProvider(signer: Signer | undefined, chainId: number);
export function getProvider(signer: Signer | undefined, chainId: number) {
  let url;

  if (signer) {
    return signer;
  }

  url = getRpcUrl(chainId);

  const network = Network.from(chainId);

  return new ethers.JsonRpcProvider(url, chainId, { staticNetwork: network });
}

export function getWsProvider(chainId: number): WebSocketProvider | JsonRpcProvider | undefined {
  const network = Network.from(chainId);

  if (chainId === ARBITRUM) {
    return new ethers.WebSocketProvider(getAlchemyWsUrl(), network, { staticNetwork: network });
  }

  if (chainId === AVALANCHE) {
    return new ethers.WebSocketProvider("wss://api.avax.network/ext/bc/C/ws", network, { staticNetwork: network });
  }

  if (chainId === ARBITRUM_GOERLI) {
    return new ethers.WebSocketProvider("wss://arb-goerli.g.alchemy.com/v2/cZfd99JyN42V9Clbs_gOvA3GSBZH1-1j", network, {
      staticNetwork: network,
    });
  }

  if (chainId === AVALANCHE_FUJI) {
    const provider = new ethers.JsonRpcProvider(getRpcUrl(AVALANCHE_FUJI), network, { staticNetwork: network });
    provider.pollingInterval = 2000;
    return provider;
  }
}

export function getFallbackProvider(chainId: number) {
  if (!FALLBACK_PROVIDERS[chainId]) {
    return;
  }

  const provider = getFallbackRpcUrl(chainId);

  return new ethers.JsonRpcProvider(provider, chainId, {
    staticNetwork: Network.from(chainId),
  });
}

export function useJsonRpcProvider(chainId: number) {
  const [provider, setProvider] = useState<JsonRpcProvider>();

  useEffect(() => {
    async function initializeProvider() {
      const rpcUrl = getRpcUrl(chainId);

      if (!rpcUrl) return;

      const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);

      console.log("CHECK ME: should have CHECK 2");
      await provider._waitUntilReady();
      console.log("CHECKED!");

      setProvider(provider);
    }

    initializeProvider();
  }, [chainId]);

  return { provider };
}

export function isWebsocketProvider(provider: any): provider is WebSocketProvider {
  return Boolean(provider?._websocket);
}

export enum WSReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export function isProviderInClosedState(wsProvider: WebSocketProvider) {
  return [WSReadyState.CLOSED, WSReadyState.CLOSING].includes(wsProvider._websocket.readyState);
}

export function closeWsConnection(wsProvider: WebSocketProvider) {
  if (isProviderInClosedState(wsProvider)) {
    return;
  }

  wsProvider.removeAllListeners();
  wsProvider._websocket.close();
}
