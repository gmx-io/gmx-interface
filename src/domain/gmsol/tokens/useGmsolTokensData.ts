import { useEffect, useMemo, useReducer, useRef } from "react";

import { getUiApiCacheKey } from "config/api";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import type { TokensDataResult } from "domain/synthetics/tokens";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import type { SolanaBalances } from "lib/solana/balances";
import { FREQUENT_UPDATE_INTERVAL, PRICES_CACHE_TTL } from "lib/timeConstants";
import { API_STALE_MS, isSnapshotPastGrace, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";

import { fetchGmsolPrices } from "./fetchGmsolPrices";
import { type GmsolTokensSnapshot, resolveGmsolTokensData } from "./resolveGmsolTokensData";
import type { GmsolTokenPricesData } from "../gmsolOracleUtils";
import { hasGmsolListedMarketPrices } from "../markets/composeGmsolMarkets";

export function useGmsolTokensData({
  enabled,
  rawMarketsInfoData,
  balancesData,
}: {
  enabled: boolean;
  rawMarketsInfoData: RawMarketsInfoData | undefined;
  balancesData?: SolanaBalances;
}): TokensDataResult & { isUnavailable: boolean; refetch: () => Promise<unknown> } {
  const oracleFetcher = useOracleKeeperFetcher(ARBITRUM);
  const key = enabled
    ? ["gmsolPrices", SOLANA_NETWORK_ID, getUiApiCacheKey(SOLANA_NETWORK_ID), oracleFetcher.url]
    : null;
  const {
    data: pricesData,
    error,
    freshness,
    refetch,
  } = useSWRWithFreshness<GmsolTokenPricesData | undefined>(key, () => fetchGmsolPrices(oracleFetcher), {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    maxAgeMs: FREQUENT_UPDATE_INTERVAL + API_STALE_MS,
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

  const tokensWithBalances = useMemo(
    () =>
      tokensData &&
      Object.fromEntries(
        Object.entries(tokensData).map(([address, token]) => [
          address,
          { ...token, balance: balancesData?.[address], walletBalance: balancesData?.[address] },
        ])
      ),
    [tokensData, balancesData]
  );

  return {
    tokensData: tokensWithBalances,
    pricesUpdatedAt: isExpired ? undefined : pricesUpdatedAt,
    isGmxAccountBalancesLoaded: false,
    isWalletBalancesLoaded: balancesData !== undefined,
    isBalancesLoaded: balancesData !== undefined,
    error,
    isUnavailable: Boolean(error) || isExpired || isIncomplete || (receivedAt !== undefined && !tokensData),
    refetch,
  };
}
