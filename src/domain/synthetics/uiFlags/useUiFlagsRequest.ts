import { useMemo } from "react";
import useSWR from "swr";

import { QA_STARTED_AT, isQaMockOn } from "config/qaMocks";
import { useChainId } from "lib/chains";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import { sleep } from "lib/sleep";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { UiFlags, confirmRelayControlFlags, persistApiFlags, readPersistedUiFlags } from "./uiFlags";

export * from "./uiFlags";

function withQaFlags(flags: UiFlags): UiFlags {
  const flag = (enabled: boolean) => ({
    enabled,
    createdAt: new Date(QA_STARTED_AT).toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const next = { ...flags };
  if (isQaMockOn("outage")) next.showServiceDisruptionBanner = flag(true);
  if (isQaMockOn("lateOutage")) next.showServiceDisruptionBanner = flag(Date.now() - QA_STARTED_AT > 30_000);
  if (isQaMockOn("targeted")) {
    next.showUsdgPoolsAnnouncementV2 = flag(true);
    next.showBalancerProgramAnnouncement = flag(true);
  }
  if (isQaMockOn("hints")) next.qaInfoHint = flag(true);
  return next;
}

export function useUiFlagsRequest() {
  const { chainId } = useChainId();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const fallbackData = useMemo(() => readPersistedUiFlags(chainId), [chainId]);

  const { data: uiFlags, isLoading } = useSWR<UiFlags>(
    ["uiFlags", chainId],
    async () => {
      if (isQaMockOn("slow")) await sleep(4_000);
      const result = await confirmRelayControlFlags(chainId, await oracleKeeperFetcher.fetchUiFlags());
      persistApiFlags(chainId, result);
      return withQaFlags(result);
    },
    {
      refreshInterval: isQaMockOn("lateOutage") ? 10_000 : CONFIG_UPDATE_INTERVAL,
      fallbackData,
    }
  );

  return { uiFlags, isLoading };
}
