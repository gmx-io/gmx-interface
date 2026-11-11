import { useMemo, useRef } from "react";
import useSWR from "swr";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import type { TokensDataResult } from "domain/synthetics/tokens";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { buildGmsolTokensData } from "./buildGmsolTokensData";
import { fetchGmsolPrices } from "./fetchGmsolPrices";
import { type GmsolTokensSnapshot, resolveGmsolTokensData } from "./resolveGmsolTokensData";
import { getGmsolApiCacheKey } from "../api/gmsolApiSdk";

type PricesResponse = { pricesData: TokenPricesData | undefined; receivedAt: number };

export function useGmsolTokensData({
  enabled,
  rawMarketsInfoData,
}: {
  enabled: boolean;
  rawMarketsInfoData: RawMarketsInfoData | undefined;
}): TokensDataResult & { isUnavailable: boolean } {
  const oracleFetcher = useOracleKeeperFetcher(ARBITRUM);
  const { data, error } = useSWR<PricesResponse, Error>(
    enabled ? ["gmsolPrices", SOLANA_NETWORK_ID, getGmsolApiCacheKey(), oracleFetcher.url] : null,
    async () => ({ pricesData: await fetchGmsolPrices(oracleFetcher), receivedAt: Date.now() }),
    { refreshInterval: FREQUENT_UPDATE_INTERVAL }
  );

  const pricesData = data?.pricesData;
  const receivedAt = data?.receivedAt;
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

  const tokensData = resolved?.tokensData;
  const isPriceCoverageIncomplete = Boolean(pricesData && rawMarketsInfoData && !tokensData);

  return {
    tokensData,
    pricesUpdatedAt: resolved?.pricesUpdatedAt,
    isGmxAccountBalancesLoaded: false,
    isWalletBalancesLoaded: false,
    isBalancesLoaded: false,
    error,
    isUnavailable: Boolean(error) || (data !== undefined && !pricesData) || isPriceCoverageIncomplete,
  };
}
