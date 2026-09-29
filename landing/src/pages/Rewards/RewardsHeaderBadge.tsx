import { t, Trans } from "@lingui/macro";
import cx from "classnames";
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
    <span
      className={cx(
        "rewards-live inline-flex items-center gap-8 whitespace-nowrap rounded-24 pb-4 pl-8 pr-12 pt-4 text-12 uppercase leading-[16px]",
        "tracking-[0.002em] text-blue-100 [border:1px_solid_#a4c3f9]",
        "max-compact:[border:0] max-compact:text-[10px] max-compact:leading-[14px] max-compact:gap-6 max-compact:p-0",
        "max-compact:[&_i]:w-6 max-compact:[&_i]:h-6",
        "[&_i::after]:pointer-events-none [&_i::after]:absolute [&_i::after]:inset-0 [&_i::after]:animate-[rewards-live-pulse_2.4s_ease-out_infinite]",
        "[&_i::after]:rounded-[inherit] [&_i::after]:[animation-delay:-1.2s] [&_i::after]:[border:1px_solid_currentColor] [&_i::after]:[content:'']",
        "motion-reduce:[&_i::after]:animate-none motion-reduce:[&_i::after]:opacity-[0]",
        "[&_i::before]:pointer-events-none [&_i::before]:absolute [&_i::before]:inset-0",
        "[&_i::before]:animate-[rewards-live-pulse_2.4s_ease-out_infinite] [&_i::before]:rounded-[inherit]",
        "[&_i::before]:[border:1px_solid_currentColor] [&_i::before]:[content:'']",
        "motion-reduce:[&_i::before]:animate-none motion-reduce:[&_i::before]:opacity-[0]",
        "[&_i]:relative [&_i]:h-8 [&_i]:w-8 [&_i]:shrink-0 [&_i]:rounded-full [&_i]:[background:#a4c3f9]"
      )}
      title={title}
    >
      <i aria-hidden="true" />
      <span className="rewards-live-full max-compact:hidden" data-qa="rewards-live-full">
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
      <span className="rewards-live-compact max-compact:inline hidden" data-qa="rewards-live-compact">
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
