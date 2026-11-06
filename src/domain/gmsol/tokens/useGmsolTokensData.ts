import { useMemo, useRef } from "react";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import type { TokensDataResult } from "domain/synthetics/tokens";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { isSnapshotPastGrace, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { buildGmsolTokensData } from "./buildGmsolTokensData";
import { fetchGmsolPrices } from "./fetchGmsolPrices";
import { type GmsolTokensSnapshot, resolveGmsolTokensData } from "./resolveGmsolTokensData";
import { getGmsolApiCacheKey } from "../api/gmsolApiSdk";

export function useGmsolTokensData({
  enabled,
  rawMarketsInfoData,
}: {
  enabled: boolean;
  rawMarketsInfoData: RawMarketsInfoData | undefined;
}): TokensDataResult & { isUnavailable: boolean } {
  const oracleFetcher = useOracleKeeperFetcher(ARBITRUM);
  const {
    data: pricesData,
    error,
    freshness,
  } = useSWRWithFreshness<TokenPricesData | undefined>(
    enabled ? ["gmsolPrices", SOLANA_NETWORK_ID, getGmsolApiCacheKey(), oracleFetcher.url] : null,
    () => fetchGmsolPrices(oracleFetcher),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  const receivedAt = freshness.asOf;
  const lastCompleteRef = useRef<GmsolTokensSnapshot>();
  const resolved = useMemo(() => {
    if (!pricesData || receivedAt === undefined) {
      return undefined;
    }

    return resolveGmsolTokensData({
      tokensData: buildGmsolTokensData(pricesData),
      receivedAt,
      rawMarketsInfoData,
      lastComplete: lastCompleteRef.current,
    });
  }, [pricesData, receivedAt, rawMarketsInfoData]);
  lastCompleteRef.current = resolved?.lastComplete ?? lastCompleteRef.current;

  const fetchError = error;
  const isExpired = isSnapshotPastGrace(receivedAt, Boolean(fetchError), FREQUENT_UPDATE_INTERVAL);
  const tokensData = isExpired ? undefined : resolved?.tokensData;

  return {
    tokensData,
    pricesUpdatedAt: isExpired ? undefined : resolved?.pricesUpdatedAt,
    isGmxAccountBalancesLoaded: false,
    isWalletBalancesLoaded: false,
    isBalancesLoaded: false,
    error: fetchError,
    isUnavailable: Boolean(fetchError) || (receivedAt !== undefined && !pricesData),
  };
}
