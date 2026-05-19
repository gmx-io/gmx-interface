import { useMemo } from "react";
import useSWR from "swr";

import { API_UI_FLAGS_CACHE_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

export type UiFlags = Record<string, boolean>;

const PERSISTED_API_FLAG_KEYS = ["apiMarkets", "apiPositions", "apiOrders", "api30", "api50", "api100"];

function getCacheKey(chainId: number): string {
  return `${API_UI_FLAGS_CACHE_KEY}-${chainId}`;
}

function readCachedApiFlags(chainId: number): UiFlags | undefined {
  try {
    const raw = localStorage.getItem(getCacheKey(chainId));
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function persistApiFlags(chainId: number, flags: UiFlags) {
  const subset: UiFlags = {};
  for (const key of PERSISTED_API_FLAG_KEYS) {
    if (key in flags) subset[key] = flags[key];
  }
  try {
    const next = JSON.stringify(subset);
    const cacheKey = getCacheKey(chainId);
    if (localStorage.getItem(cacheKey) !== next) {
      localStorage.setItem(cacheKey, next);
    }
  } catch {
    // ignore
  }
}

export function useUiFlagsRequest() {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const fallbackData = useMemo(() => readCachedApiFlags(chainId), [chainId]);

  const { data: uiFlags } = useSWR<UiFlags>(
    ["uiFlags", chainId],
    async () => {
      const result = await oracleKeeperFetcher.fetchUiFlags();
      persistApiFlags(chainId, result);
      return result;
    },
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      fallbackData,
    }
  );

  return { uiFlags };
}
