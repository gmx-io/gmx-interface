import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useReducer } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";

import { RewardsValue } from "./RewardsValue";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function RewardsClosingNote({
  config,
  loading,
}: {
  config?: Pick<IncentivesConfig, "programStartTimestamp" | "epochTimestamp" | "epochDuration"> | null;
  loading: boolean;
}) {
  const { i18n } = useLingui();
  const [stateVersion, refresh] = useReducer((version: number) => version + 1, 0);
  const startTimestamp = config?.programStartTimestamp;
  const isPrelaunch = startTimestamp !== undefined && startTimestamp * 1000 > Date.now();
  const epochEnd = config ? new Date((config.epochTimestamp + config.epochDuration) * 1000) : undefined;

  useEffect(() => {
    if (startTimestamp === undefined || !isPrelaunch) return;

    const remainingMs = Math.max(startTimestamp * 1000 - Date.now(), 0);
    const timeoutId = window.setTimeout(refresh, Math.min(remainingMs, MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timeoutId);
  }, [startTimestamp, isPrelaunch, stateVersion]);

  if (isPrelaunch) {
    const start = new Date(startTimestamp * 1000);
    const startDate = start.toLocaleDateString(i18n.locale === "en" ? "en-GB" : i18n.locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
    const startTime = start.toLocaleTimeString(i18n.locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    });

    return (
      <p>
        <Trans>
          Season 1 rewards kick off on {startDate} at {startTime} UTC
        </Trans>
      </p>
    );
  }

  return (
    <p>
      <Trans>
        Trade before{" "}
        <RewardsValue loading={loading} width="18ch">
          {epochEnd && (
            <time dateTime={epochEnd.toISOString()}>
              {epochEnd.toLocaleString(i18n.locale, {
                weekday: "long",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
                timeZone: "UTC",
              })}{" "}
              UTC
            </time>
          )}
        </RewardsValue>{" "}
        and you're in this epoch.
      </Trans>
    </p>
  );
}
