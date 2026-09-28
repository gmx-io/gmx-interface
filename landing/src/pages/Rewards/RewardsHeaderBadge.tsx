import { t, Trans } from "@lingui/macro";
import { useEffect, useReducer } from "react";

import { ARBITRUM } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { secondsFrom } from "sdk/utils/time";

const MINUTE_MS = secondsFrom("1m") * 1000;

export function RewardsHeaderBadge() {
  const { data: config } = useIncentivesConfig(ARBITRUM);
  const [stateVersion, refresh] = useReducer((version: number) => version + 1, 0);
  const startTimestamp = config?.programStartTimestamp;
  const remainingMs = startTimestamp === undefined ? undefined : Math.max(startTimestamp * 1000 - Date.now(), 0);
  const isLive = remainingMs === 0;
  const remainingMinutes = Math.ceil((remainingMs ?? 0) / MINUTE_MS);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const countdown = remainingMs ? t`${hours}h ${minutes}m` : undefined;
  const title = countdown ? t`Season 1 - ${countdown}` : isLive ? t`Season 1 · Live` : t`Season 1 · Soon`;

  useEffect(() => {
    if (startTimestamp === undefined || isLive) return;

    const remainingMs = Math.max(startTimestamp * 1000 - Date.now(), 0);
    const nextMinuteMs = remainingMs % MINUTE_MS || MINUTE_MS;
    const timeoutId = window.setTimeout(refresh, Math.min(remainingMs, nextMinuteMs));
    return () => window.clearTimeout(timeoutId);
  }, [startTimestamp, isLive, stateVersion]);

  return (
    <span className="rewards-live" title={title}>
      <i aria-hidden="true" />
      <span className="rewards-live-full">
        {countdown ? (
          <Trans>
            Season 1 - <span className="normal-case tabular-nums">{countdown}</span>
          </Trans>
        ) : isLive ? (
          <Trans>Season 1 · Live</Trans>
        ) : (
          <Trans>Season 1 · Soon</Trans>
        )}
      </span>
      <span className="rewards-live-compact">
        {countdown ? (
          <span className="normal-case tabular-nums">{countdown}</span>
        ) : isLive ? (
          <Trans>Live</Trans>
        ) : (
          <Trans>Soon</Trans>
        )}
      </span>
    </span>
  );
}
