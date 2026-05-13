import { useEffect, useState } from "react";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/types";

type EpochTimingConfig = Pick<IncentivesConfig, "epochDuration" | "epochStartTimestamp" | "epochTimestamp">;

export function useCurrentUnixTimestamp(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}

/**
 * Format an epoch time-remaining in seconds as a human-readable string.
 * - "Xd Yh" when `days > 0` (or when `alwaysShowDays` is true).
 * - "Hh Mm" when less than a day remains.
 * Returns an empty string for non-positive inputs.
 */
export function formatTimeLeft(seconds: number, options: { alwaysShowDays?: boolean } = {}): string {
  if (seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0 || options.alwaysShowDays) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function getCurrentEpochEndTime(config: EpochTimingConfig | undefined, now: number): number {
  if (!config) return 0;

  const epochDuration = getEpochDuration(config);
  const epochStart = config.epochStartTimestamp || config.epochTimestamp;

  if (!epochStart || epochDuration <= 0) {
    return 0;
  }

  if (now < epochStart) {
    return epochStart + epochDuration;
  }

  const elapsedEpochs = Math.floor((now - epochStart) / epochDuration);
  return epochStart + (elapsedEpochs + 1) * epochDuration;
}
