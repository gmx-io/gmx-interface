import useSWR from "swr";

import { CONTRACTS_CHAIN_IDS } from "config/chains";
import { UiFlags } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { getOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

/**
 * Ui flags merged across all announcement chains, so the page does not depend on the connected chain.
 */
export function useAnnouncementsUiFlags() {
  const {
    data: uiFlags,
    error,
    isLoading,
  } = useSWR<UiFlags>(
    "announcementsUiFlags",
    async () => {
      const results = await Promise.allSettled(
        CONTRACTS_CHAIN_IDS.map((chainId) => getOracleKeeperFetcher(chainId).fetchUiFlags())
      );

      if (results.every((result) => result.status === "rejected")) {
        throw new Error("Failed to load announcements ui flags");
      }

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

  return { uiFlags, isLoading, error };
}
