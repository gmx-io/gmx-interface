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
import { JsonRpcProvider, Web3Provider } from "@ethersproject/providers";

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

let arbWsProvider: JsonRpcProvider | undefined = undefined;
let avaxWsProvider: JsonRpcProvider | undefined = undefined;
let goerliWsProvider: JsonRpcProvider | undefined = undefined;
let fujiWsProvider: JsonRpcProvider | undefined = undefined;

export function getWsProvider(active, chainId) {
  if (!active) {
    return;
  }
  if (chainId === ARBITRUM) {
    if (!arbWsProvider) {
      arbWsProvider = new ethers.providers.WebSocketProvider(getAlchemyWsUrl());
    }

    return arbWsProvider;
  }

  if (chainId === AVALANCHE) {
    if (!avaxWsProvider) {
      avaxWsProvider = new ethers.providers.WebSocketProvider("wss://api.avax.network/ext/bc/C/ws");
    }

    return avaxWsProvider;
  }

  if (chainId === ARBITRUM_GOERLI) {
    if (!goerliWsProvider) {
      goerliWsProvider = new ethers.providers.WebSocketProvider(
        "wss://arb-goerli.g.alchemy.com/v2/cZfd99JyN42V9Clbs_gOvA3GSBZH1-1j"
      );
    }

    return goerliWsProvider;
  }

  if (chainId === AVALANCHE_FUJI) {
    if (!fujiWsProvider) {
      fujiWsProvider = new ethers.providers.JsonRpcProvider(getRpcUrl(AVALANCHE_FUJI));
      fujiWsProvider.pollingInterval = 2000;
    }

    return fujiWsProvider;
  }
}
