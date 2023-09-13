import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers";
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

export function getProvider(signer: Signer | undefined, chainId: number) {
  let provider;

  if (signer) {
    return signer;
  }

  provider = getRpcUrl(chainId);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
}

export function getWsProvider(chainId: number): WebSocketProvider | JsonRpcProvider | undefined {
  if (chainId === ARBITRUM) {
    return new ethers.providers.WebSocketProvider(getAlchemyWsUrl());
  }

  if (chainId === AVALANCHE) {
    return new ethers.providers.WebSocketProvider("wss://api.avax.network/ext/bc/C/ws");
  }

  if (chainId === ARBITRUM_GOERLI) {
    return new ethers.providers.WebSocketProvider("wss://arb-goerli.g.alchemy.com/v2/cZfd99JyN42V9Clbs_gOvA3GSBZH1-1j");
  }

  if (chainId === AVALANCHE_FUJI) {
    const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(AVALANCHE_FUJI));
    provider.pollingInterval = 2000;
    return provider;
  }
}

export function getFallbackProvider(chainId: number) {
  if (!FALLBACK_PROVIDERS[chainId]) {
    return;
  }

  const provider = getFallbackRpcUrl(chainId);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
}

export function useJsonRpcProvider(chainId: number) {
  const [provider, setProvider] = useState<JsonRpcProvider>();

  useEffect(() => {
    async function initializeProvider() {
      const rpcUrl = getRpcUrl(chainId);

      if (!rpcUrl) return;

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      await provider.ready;

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
