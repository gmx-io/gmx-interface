import { getWhitelistedTokens } from "config/tokens";
import { useMemo } from "react";
import { TokensData } from "./types";
import { useTokenBalances } from "./useTokenBalances";
import { useTokenConfigs } from "./useTokenConfigs";
import { useTokenRecentPrices } from "./useTokenRecentPrices";

export function useTokensData(chainId: number, p: { tokenAddresses: string[] }): TokensData {
  const balancesData = useTokenBalances(chainId, { tokenAddresses: p.tokenAddresses });
  const pricesData = useTokenRecentPrices(chainId);
  const tokenConfigs = useTokenConfigs(chainId);

  const result = useMemo(
    () => ({ ...balancesData, ...pricesData, ...tokenConfigs }),
    [balancesData, pricesData, tokenConfigs]
  );

  return result;
}

export function useWhitelistedTokensData(chainId: number) {
  const tokenAddresses = getWhitelistedTokens(chainId).map((token) => token.address);

  return useTokensData(chainId, { tokenAddresses });
}
