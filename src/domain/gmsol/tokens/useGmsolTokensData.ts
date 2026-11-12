import { useEffect, useReducer, useRef } from "react";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import type { TokensDataResult } from "domain/synthetics/tokens";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL, PRICES_CACHE_TTL } from "lib/timeConstants";
import { isSnapshotPastGrace, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";

import { fetchGmsolPrices } from "./fetchGmsolPrices";
import { type GmsolTokensSnapshot, resolveGmsolTokensData } from "./resolveGmsolTokensData";
import { getGmsolApiCacheKey } from "../api/gmsolApiSdk";
import type { GmsolTokenPricesData } from "../gmsolOracleFetcher";
import { hasGmsolListedMarketPrices } from "../markets/composeGmsolMarkets";

export function useGmsolTokensData({
  enabled,
  rawMarketsInfoData,
}: {
  enabled: boolean;
  rawMarketsInfoData: RawMarketsInfoData | undefined;
}): TokensDataResult & { isUnavailable: boolean } {
  const oracleFetcher = useOracleKeeperFetcher(ARBITRUM);
  const key = enabled ? ["gmsolPrices", SOLANA_NETWORK_ID, getGmsolApiCacheKey(), oracleFetcher.url] : null;
  const {
    data: pricesData,
    error,
    freshness,
  } = useSWRWithFreshness<GmsolTokenPricesData | undefined>(key, () => fetchGmsolPrices(oracleFetcher), {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
  });

  const receivedAt = freshness.asOf;
  const snapshotRef = useRef<GmsolTokensSnapshot>();
  const snapshot = key
    ? resolveGmsolTokensData({
        previous: snapshotRef.current,
        scope: key.join(" "),
        response: pricesData,
        now: Date.now(),
      })
    : undefined;
  snapshotRef.current = snapshot;

  const pricesUpdatedAt = snapshot?.pricesUpdatedAt;
  const [pricesExpiryCheck, checkPricesExpiry] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    if (pricesUpdatedAt === undefined) return;

    const timeout = setTimeout(checkPricesExpiry, Math.max(0, pricesUpdatedAt + PRICES_CACHE_TTL - Date.now()));
    return () => clearTimeout(timeout);
  }, [pricesUpdatedAt, pricesExpiryCheck]);

  const isExpired = isSnapshotPastGrace(receivedAt, FREQUENT_UPDATE_INTERVAL);
  const tokensData = isExpired ? undefined : snapshot?.tokensData;
  const isIncomplete =
    rawMarketsInfoData !== undefined &&
    tokensData !== undefined &&
    !hasGmsolListedMarketPrices(rawMarketsInfoData, tokensData);

  return {
    tokensData,
    pricesUpdatedAt: isExpired ? undefined : pricesUpdatedAt,
    isGmxAccountBalancesLoaded: false,
    isWalletBalancesLoaded: false,
    isBalancesLoaded: false,
    error,
    isUnavailable: Boolean(error) || isExpired || isIncomplete || (receivedAt !== undefined && !tokensData),
  };
}
