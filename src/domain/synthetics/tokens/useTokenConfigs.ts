import { getTokensMap } from "config/tokens";
import { useMemo } from "react";
import { TokenConfigsData } from "./types";

export function useTokenConfigs(chainId: number): TokenConfigsData {
  return useMemo(() => {
    return {
      tokenConfigs: getTokensMap(chainId),
    };
  }, [chainId]);
}
