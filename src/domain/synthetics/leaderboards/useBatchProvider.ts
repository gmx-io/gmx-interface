import { JsonRpcBatchProvider } from "@ethersproject/providers";
import { ETH_MAINNET, getRpcUrl } from "config/chains";
import { useEffect, useRef } from "react";

export function useBatchProvider(chainId = ETH_MAINNET) {
  const provider = useRef<Record<string, JsonRpcBatchProvider>>({});

  useEffect(() => {
    if (provider.current && provider.current[chainId]) {
      return;
    }
    const url = getRpcUrl(chainId);
    provider.current[chainId] = new JsonRpcBatchProvider(url, chainId);
  }, [chainId]);

  return provider.current[chainId];
}
