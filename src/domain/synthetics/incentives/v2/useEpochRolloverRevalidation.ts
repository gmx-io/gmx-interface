import { useEffect, useRef, useState } from "react";

const ROLLOVER_RETRY_DELAYS = [5_000, 15_000, 30_000];

type ScheduledRollover = {
  epochTimestamp: number;
  scopeKey: string;
  startedAt: number;
  completedAttempts: number;
};

export function useEpochRolloverRevalidation({
  epochTimestamp,
  enabled,
  scopeKey,
  revalidate,
}: {
  epochTimestamp: number | undefined;
  enabled: boolean;
  scopeKey: string;
  revalidate: () => Promise<unknown>;
}) {
  const previousEpochRef = useRef<{ epochTimestamp: number; scopeKey: string }>();
  const scheduledRolloverRef = useRef<ScheduledRollover>();
  const revalidateRef = useRef(revalidate);
  const [rollover, setRollover] = useState<{ epochTimestamp: number; scopeKey: string }>();

  useEffect(() => {
    revalidateRef.current = revalidate;
  }, [revalidate]);

  useEffect(() => {
    if (epochTimestamp === undefined) {
      previousEpochRef.current = undefined;
      scheduledRolloverRef.current = undefined;
      setRollover(undefined);
      return;
    }

    const previous = previousEpochRef.current;
    const current = { epochTimestamp, scopeKey };

    if (previous === undefined || previous.scopeKey !== scopeKey) {
      previousEpochRef.current = current;
      scheduledRolloverRef.current = undefined;
      setRollover(undefined);
      return;
    }

    if (previous.epochTimestamp !== epochTimestamp) {
      previousEpochRef.current = current;
      setRollover(current);
    }
  }, [epochTimestamp, scopeKey]);

  useEffect(() => {
    if (!enabled || rollover === undefined || rollover.scopeKey !== scopeKey) return;

    let scheduled = scheduledRolloverRef.current;
    if (scheduled?.scopeKey !== rollover.scopeKey || scheduled.epochTimestamp !== rollover.epochTimestamp) {
      scheduled = {
        ...rollover,
        startedAt: Date.now(),
        completedAttempts: 0,
      };
      scheduledRolloverRef.current = scheduled;
    }

    if (scheduled.completedAttempts >= ROLLOVER_RETRY_DELAYS.length) return;

    const activeSchedule = scheduled;
    const timeoutIds = ROLLOVER_RETRY_DELAYS.slice(activeSchedule.completedAttempts).map((delay, index) => {
      const attempt = activeSchedule.completedAttempts + index;
      const remainingDelay = Math.max(activeSchedule.startedAt + delay - Date.now(), 0);

      return window.setTimeout(() => {
        if (scheduledRolloverRef.current !== activeSchedule) return;

        activeSchedule.completedAttempts = Math.max(activeSchedule.completedAttempts, attempt + 1);
        void revalidateRef.current().catch(() => undefined);
      }, remainingDelay);
    });

    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [enabled, rollover, scopeKey]);
}
