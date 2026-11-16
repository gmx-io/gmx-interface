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
        for (const [flag, meta] of Object.entries(result.value)) {
          const prev = merged[flag];
          const enabled = (prev?.enabled ?? false) || meta.enabled;
          // createdAt = earliest activation among chains where the flag is enabled (true first go-live)
          let createdAt = prev?.createdAt;
          if (meta.enabled && (createdAt === undefined || new Date(meta.createdAt) < new Date(createdAt))) {
            createdAt = meta.createdAt;
          }
          merged[flag] = { enabled, createdAt: createdAt ?? meta.createdAt, updatedAt: meta.updatedAt };
        }
      }

      return merged;
    },
    { refreshInterval: CONFIG_UPDATE_INTERVAL }
  );

  return { uiFlags, isLoading, error };
}
