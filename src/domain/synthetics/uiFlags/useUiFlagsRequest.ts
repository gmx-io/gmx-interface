import pick from "lodash/pick";
import { useMemo } from "react";
import useSWR from "swr";

import { API_UI_FLAGS_CACHE_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

export type UiFlag = {
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UiFlags = Record<string, UiFlag>;

export const IS_V2_JIT_LIQUIDITY_INFO_ENABLED_UI_FLAG = "isV2JitLiquidityInfoEnabled";

export function getIsV2JitLiquidityInfoEnabled(uiFlags: UiFlags | undefined): boolean {
  return uiFlags?.[IS_V2_JIT_LIQUIDITY_INFO_ENABLED_UI_FLAG]?.enabled !== false;
}

export const FORCE_GELATO_FALLBACK_UI_FLAG = "forceGelatoFallback";

/** Only an explicit `true` forces the fallback: an unreachable keeper must not undo a rollout. */
export function getIsGelatoFallbackForced(uiFlags: UiFlags | undefined): boolean {
  return uiFlags?.[FORCE_GELATO_FALLBACK_UI_FLAG]?.enabled === true;
}

export const IS_EXPRESS_AVAILABLE_UI_FLAG = "isExpressAvailable";

/** Fail-open: only an explicit `false` disables express — an unreachable keeper or an unpublished flag must not. */
export function getIsExpressAvailable(uiFlags: UiFlags | undefined): boolean {
  return uiFlags?.[IS_EXPRESS_AVAILABLE_UI_FLAG]?.enabled !== false;
}

const PERSISTED_API_FLAG_KEYS = [
  "apiMarkets",
  "apiPositions",
  "apiOrders",
  "api30",
  "api50",
  "api100",
  IS_V2_JIT_LIQUIDITY_INFO_ENABLED_UI_FLAG,
  // a reload mid-incident must restore the last known value rather than blank-default on first paint
  IS_EXPRESS_AVAILABLE_UI_FLAG,
  FORCE_GELATO_FALLBACK_UI_FLAG,
];

function getCacheKey(chainId: number): string {
  return `${API_UI_FLAGS_CACHE_KEY}-${chainId}`;
}

export function readPersistedUiFlags(chainId: number): UiFlags | undefined {
  return readCachedApiFlags(chainId);
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

/** A keeper replica is elected on price health alone and can serve a stale flag; acting values are confirmed with the configured keeper. */
export async function confirmRelayControlFlags(chainId: number, flags: UiFlags): Promise<UiFlags> {
  const isActing =
    flags[IS_EXPRESS_AVAILABLE_UI_FLAG]?.enabled === false || flags[FORCE_GELATO_FALLBACK_UI_FLAG]?.enabled === true;

  if (!isActing) {
    return flags;
  }

  try {
    // this runs mid-incident, when the keeper is likeliest to hang — a stalled socket here would
    // park the whole uiFlags refresh cycle behind it
    const response = await fetch(`${getOracleKeeperUrl(chainId)}/ui-flags/v2`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return flags;
    }

    const canonical = (await response.json()) as UiFlags;

    return {
      ...flags,
      ...pick(canonical, [IS_EXPRESS_AVAILABLE_UI_FLAG, FORCE_GELATO_FALLBACK_UI_FLAG]),
    };
  } catch {
    return flags;
  }
}

export function useUiFlagsRequest() {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const fallbackData = useMemo(() => readCachedApiFlags(chainId), [chainId]);

  const { data: uiFlags } = useSWR<UiFlags>(
    ["uiFlags", chainId],
    async () => {
      const result = await confirmRelayControlFlags(chainId, await oracleKeeperFetcher.fetchUiFlags());
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
