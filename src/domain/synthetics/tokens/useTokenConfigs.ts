import { getTokensMap } from "config/tokens";
import { TokenConfigsData } from "./types";

export function useTokenConfigs(chainId: number): TokenConfigsData {
  return {
    tokenConfigs: getTokensMap(chainId),
  };
}
