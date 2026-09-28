import useSWR from "swr";

import { fetchIncentiveEpochAudit } from "./fetchIncentiveEpochAudit";
import { useIncentivesIndexerUrl } from "./useIncentivesIndexerUrl";

export function useIncentiveEpochAudit(chainId: number, epochTimestamp: number | undefined) {
  const endpoint = useIncentivesIndexerUrl(chainId);
  const key =
    endpoint && epochTimestamp !== undefined ? ["incentiveEpochAudit", chainId, endpoint, epochTimestamp] : null;

  return useSWR(key, () => fetchIncentiveEpochAudit(endpoint!, epochTimestamp!), {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    keepPreviousData: false,
  });
}
