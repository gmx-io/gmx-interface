const SUMMARY_INTERVAL = 60 * 1000;

export type EventRepeats = {
  repeatCount: number;
  firstTs: number;
  lastTs: number;
};

type PendingSummary<TEvent> = {
  event: TEvent;
  repeats: EventRepeats;
};

export function createRepeatedEventsReporter<TEvent>(report: (event: TEvent, repeats?: EventRepeats) => void) {
  const lastSeenTsByKey = new Map<string, number>();
  const pendingByKey = new Map<string, PendingSummary<TEvent>>();
  let summaryStartTs: number | undefined;
  let summaryTimeoutId: number | undefined;

  const flush = () => {
    if (summaryTimeoutId !== undefined) {
      window.clearTimeout(summaryTimeoutId);
      summaryTimeoutId = undefined;
    }

    summaryStartTs = undefined;

    const summaries = [...pendingByKey.values()];
    pendingByKey.clear();

    summaries.forEach(({ event, repeats }) => report(event, repeats));
  };

  const onEvent = (key: string, event: TEvent) => {
    const now = Date.now();

    // The summary timer can fire late in a background tab
    if (summaryStartTs !== undefined && now - summaryStartTs >= SUMMARY_INTERVAL) {
      flush();
    }

    lastSeenTsByKey.forEach((ts, seenKey) => {
      if (now - ts >= SUMMARY_INTERVAL) {
        lastSeenTsByKey.delete(seenKey);
      }
    });

    const isRepeat = lastSeenTsByKey.has(key);
    lastSeenTsByKey.set(key, now);

    if (!isRepeat) {
      flush();
      report(event);
      return;
    }

    const pending = pendingByKey.get(key);

    if (pending) {
      pendingByKey.set(key, {
        event,
        repeats: { ...pending.repeats, repeatCount: pending.repeats.repeatCount + 1, lastTs: now },
      });
      return;
    }

    pendingByKey.set(key, { event, repeats: { repeatCount: 1, firstTs: now, lastTs: now } });

    if (summaryStartTs === undefined) {
      summaryStartTs = now;
      summaryTimeoutId = window.setTimeout(flush, SUMMARY_INTERVAL);
    }
  };

  return { onEvent, flush };
}
