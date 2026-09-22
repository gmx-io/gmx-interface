import useSWR from "swr";

import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { getIncentivesEpochStats } from "./getIncentivesEpochStats";
import type { IncentivesConfig } from "./types";

export function useIncentivesEpochStats(endpoint: string | undefined, config: IncentivesConfig | null | undefined) {
  const epoch = config ? config.epochTimestamp - config.epochDuration : undefined;
  return useSWR(
    endpoint && config && epoch !== undefined && epoch >= config.programStartTimestamp
      ? (["incentivesEpochStats", endpoint, epoch] as const)
      : null,
    ([, url, timestamp]) => getIncentivesEpochStats(url, timestamp),
    { revalidateOnFocus: false, refreshInterval: 5 * CONFIG_UPDATE_INTERVAL }
  );
}
