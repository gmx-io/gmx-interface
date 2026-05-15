import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

export type UiFlags = Record<string, boolean>;

export const IS_V2_JIT_LIQUIDITY_INFO_ENABLED_UI_FLAG = "isV2JitLiquidityInfoEnabled";

export function getIsV2JitLiquidityInfoEnabled(uiFlags: UiFlags | undefined): boolean {
  return uiFlags?.[IS_V2_JIT_LIQUIDITY_INFO_ENABLED_UI_FLAG] === true;
}

export function useUiFlagsRequest(chainIdOverride?: ContractsChainId) {
  const { chainId } = useChainId();
  const requestChainId = chainIdOverride ?? chainId;
  const oracleKeeperFetcher = useOracleKeeperFetcher(requestChainId);

  const { data: uiFlags } = useSWR<UiFlags>(
    ["uiFlags", requestChainId],
    async () => {
      return oracleKeeperFetcher.fetchUiFlags();
    },
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return { uiFlags };
}
