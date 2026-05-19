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
