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

/**
 * Pulls every user back to Gelato regardless of the rollout split. Only an explicit `true` forces it,
 * so an unreachable keeper leaves the split as configured rather than silently undoing a rollout.
 */
export function getIsGelatoFallbackForced(uiFlags: UiFlags | undefined): boolean {
  return uiFlags?.[FORCE_GELATO_FALLBACK_UI_FLAG]?.enabled === true;
}

export const IS_EXPRESS_AVAILABLE_UI_FLAG = "isExpressAvailable";

/**
 * Fail-open: an unreachable keeper, or a chain that never published the flag, must not take express
 * away from everyone. Only an explicit `false` disables it.
 */
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

/** For code outside React that has to know a persisted flag before the next fetch resolves. */
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

/**
 * The flags arrive from whichever keeper replica the fallback tracker elected, and it elects on
 * price health — a replica can serve good prices and a stale flag, and stay elected for as long as
 * its prices are fine. That is survivable for a banner and not for a switch that takes express away,
 * so before acting on one, ask the configured keeper directly. Only the acting values are worth a
 * request: the common case costs nothing.
 */
export async function confirmRelayControlFlags(chainId: number, flags: UiFlags): Promise<UiFlags> {
  const isActing =
    flags[IS_EXPRESS_AVAILABLE_UI_FLAG]?.enabled === false || flags[FORCE_GELATO_FALLBACK_UI_FLAG]?.enabled === true;

  if (!isActing) {
    return flags;
  }

  try {
    const response = await fetch(`${getOracleKeeperUrl(chainId)}/ui-flags/v2`);
    const canonical = (await response.json()) as UiFlags;

    return {
      ...flags,
      ...pick(canonical, [IS_EXPRESS_AVAILABLE_UI_FLAG, FORCE_GELATO_FALLBACK_UI_FLAG]),
    };
  } catch {
    // the replica that answered is all we have; acting on it beats ignoring a switch someone threw
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
