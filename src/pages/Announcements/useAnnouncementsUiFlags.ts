import useSWR from "swr";

import { UiFlags } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { getOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { ANNOUNCEMENTS_CHAINS } from "./announcementsHelpers";

/**
 * Ui flags merged across all announcement chains, so the page does not depend on the connected chain.
 */
export function useAnnouncementsUiFlags() {
  const { data: uiFlags } = useSWR<UiFlags>(
    "announcementsUiFlags",
    async () => {
      const results = await Promise.allSettled(
        ANNOUNCEMENTS_CHAINS.map((chainId) => getOracleKeeperFetcher(chainId).fetchUiFlags())
      );

      const merged: UiFlags = {};
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const [flag, value] of Object.entries(result.value)) {
          merged[flag] = merged[flag] || value;
        }
      }

      return merged;
    },
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  return { uiFlags };
}
