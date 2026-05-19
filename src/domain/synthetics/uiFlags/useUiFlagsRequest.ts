import useSWR from "swr";

import { API_UI_FLAGS_CACHE_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

export type UiFlags = Record<string, boolean>;

const PERSISTED_API_FLAG_KEYS = ["apiMarkets", "apiPositions", "apiOrders", "api30", "api50", "api100"];

function readCachedApiFlags(): UiFlags | undefined {
  try {
    const raw = localStorage.getItem(API_UI_FLAGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function persistApiFlags(flags: UiFlags) {
  const subset: UiFlags = {};
  for (const key of PERSISTED_API_FLAG_KEYS) {
    if (key in flags) subset[key] = flags[key];
  }
  try {
    const next = JSON.stringify(subset);
    if (localStorage.getItem(API_UI_FLAGS_CACHE_KEY) !== next) {
      localStorage.setItem(API_UI_FLAGS_CACHE_KEY, next);
    }
  } catch {
    // ignore
  }
}

const initialCachedFlags = readCachedApiFlags();

export function useUiFlagsRequest() {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data: uiFlags } = useSWR<UiFlags>(
    ["uiFlags", chainId],
    async () => {
      const result = await oracleKeeperFetcher.fetchUiFlags();
      persistApiFlags(result);
      return result;
    },
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      fallbackData: initialCachedFlags,
    }
  );

  return { uiFlags };
}
