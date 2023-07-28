import { useEffect, useState } from "react";
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
import { ethers } from "ethers";
import { JsonRpcProvider, Web3Provider, WebSocketProvider } from "@ethersproject/providers";

export function getProvider(library: Web3Provider | undefined, chainId: number) {
  let provider;

  if (library) {
    return library.getSigner();
  }

  provider = getRpcUrl(chainId);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
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

const cachedWsProviders: { [chainId: number]: WebSocketProvider | JsonRpcProvider | undefined } = {};

export function getWsProvider(active, chainId) {
  if (!active) {
    return;
  }

  if (cachedWsProviders[chainId]) {
    return cachedWsProviders[chainId];
  }

  let provider: WebSocketProvider | JsonRpcProvider | undefined;

  if (chainId === ARBITRUM) {
    provider = new ethers.providers.WebSocketProvider(getAlchemyWsUrl());
  }
  if (chainId === AVALANCHE) {
    provider = new ethers.providers.WebSocketProvider("wss://api.avax.network/ext/bc/C/ws");
  }
  if (chainId === ARBITRUM_GOERLI) {
    provider = new ethers.providers.WebSocketProvider(
      "wss://arb-goerli.g.alchemy.com/v2/cZfd99JyN42V9Clbs_gOvA3GSBZH1-1j"
    );
  }
  if (chainId === AVALANCHE_FUJI) {
    provider = new ethers.providers.JsonRpcProvider(getRpcUrl(AVALANCHE_FUJI));
    provider.pollingInterval = 2000;
  }

  if (!provider) {
    return;
  }

  cachedWsProviders[chainId] = provider;

  return provider;
}
