import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { ETH_MAINNET, getRpcUrl } from "config/chains";
import { useEffect, useRef } from "react";

export function useStaticMainnetProvider() {
  const provider = useRef<StaticJsonRpcProvider>();

  useEffect(() => {
    if (provider.current) {
      return;
    }
    const url = getRpcUrl(ETH_MAINNET);
    provider.current = new StaticJsonRpcProvider(url, ETH_MAINNET);
  }, [provider]);

  return provider.current;
}
