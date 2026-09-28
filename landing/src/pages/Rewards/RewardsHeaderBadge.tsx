import { t, Trans } from "@lingui/macro";
import { useEffect, useReducer } from "react";

import { ARBITRUM } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

export function RewardsHeaderBadge() {
  const { data: config } = useIncentivesConfig(ARBITRUM);
  const [stateVersion, refresh] = useReducer((version: number) => version + 1, 0);
  const startTimestamp = config?.programStartTimestamp;
  const isLive = startTimestamp !== undefined && startTimestamp * 1000 <= Date.now();

  useEffect(() => {
    if (startTimestamp === undefined || isLive) return;

    const remainingMs = Math.max(startTimestamp * 1000 - Date.now(), 0);
    const timeoutId = window.setTimeout(refresh, Math.min(remainingMs + 1, CONFIG_UPDATE_INTERVAL));
    return () => window.clearTimeout(timeoutId);
  }, [startTimestamp, isLive, stateVersion]);

  return (
    <span className="rewards-live" title={isLive ? t`Season 1 · Live` : t`Season 1 · Soon`}>
      <i aria-hidden="true" />
      <span className="rewards-live-full">
        {isLive ? <Trans>Season 1 · Live</Trans> : <Trans>Season 1 · Soon</Trans>}
      </span>
      <span className="rewards-live-compact">{isLive ? <Trans>Live</Trans> : <Trans>Soon</Trans>}</span>
    </span>
  );
}
