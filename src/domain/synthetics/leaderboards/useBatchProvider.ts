import { JsonRpcBatchProvider } from "@ethersproject/providers";
import { ETH_MAINNET, getRpcUrl } from "config/chains";
import { useEffect, useRef } from "react";

export function useBatchProvider() {
  const provider = useRef<JsonRpcBatchProvider>();

  useEffect(() => {
    if (provider.current) {
      return;
    }
    const url = getRpcUrl(ETH_MAINNET);
    provider.current = new JsonRpcBatchProvider(url, ETH_MAINNET);
  }, [provider]);

  return provider.current;
}
