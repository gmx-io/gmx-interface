import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchIncentivesGraphql } from "./client";
import { parseIncentivesConfig, type RawIncentivesConfig } from "./parsers";
import { INCENTIVES_CONFIG_QUERY } from "./queries";
import type { IncentivesConfig } from "./types";
import { useIncentivesIndexerUrl } from "./useIncentivesIndexerUrl";

const CONFIG_SAFETY_REFRESH_INTERVAL = 5 * CONFIG_UPDATE_INTERVAL;
// The last retry must land beyond the indexer's 60s response cache TTL,
// which can serve the previous epoch right after a boundary.
const BOUNDARY_RETRY_DELAYS = [5_000, 15_000, 30_000, 45_000];

export function useIncentivesConfig(chainId: number, params: { enabled?: boolean } = {}) {
  const { enabled = true } = params;
  const endpoint = useIncentivesIndexerUrl(chainId);
  const swrKey = enabled && endpoint ? ["useIncentivesV2Config", chainId, endpoint] : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<IncentivesConfig | null>(swrKey, {
    fetcher: async () => {
      const response = await fetchIncentivesGraphql<{ currentIncentivesConfig: RawIncentivesConfig | null }>(
        endpoint!,
        INCENTIVES_CONFIG_QUERY
      );

      return parseIncentivesConfig(response.currentIncentivesConfig);
    },
    refreshInterval: CONFIG_SAFETY_REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });

  const revalidatedBoundaryRef = useRef<{ boundary: number; endpoint?: string }>();

  useEffect(() => {
    if (!data) return;

    const boundary = data.epochTimestamp + data.epochDuration;
    if (revalidatedBoundaryRef.current?.boundary === boundary && revalidatedBoundaryRef.current.endpoint === endpoint) {
      return;
    }

    let cancelled = false;
    let timeoutId: number;

    const revalidate = async (attempt: number) => {
      let nextConfig: IncentivesConfig | null | undefined;

      try {
        nextConfig = await mutate();
      } catch (_error) {
        nextConfig = undefined;
      }

      if (cancelled) return;

      const hasRolledOver = nextConfig !== undefined && nextConfig?.epochTimestamp !== data.epochTimestamp;
      if (hasRolledOver) {
        revalidatedBoundaryRef.current = { boundary, endpoint };
        return;
      }

      const retryDelay = BOUNDARY_RETRY_DELAYS[attempt];
      if (retryDelay === undefined) {
        revalidatedBoundaryRef.current = { boundary, endpoint };
        return;
      }

      timeoutId = window.setTimeout(() => void revalidate(attempt + 1), retryDelay);
    };

    const boundaryDelay = Math.max(boundary * 1000 - Date.now() + 1000, 1000);
    timeoutId = window.setTimeout(() => void revalidate(0), boundaryDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [data, endpoint, mutate]);

  return useMemo(
    () => ({ data, error, loading: isLoading, isValidating, mutate, endpoint }),
    [data, endpoint, error, isLoading, isValidating, mutate]
  );
}
