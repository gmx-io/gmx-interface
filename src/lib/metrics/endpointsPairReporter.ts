import type { EndpointsPairRepeats } from "./types";

const SUMMARY_INTERVAL = 5 * 60 * 1000;

type PendingSummary<TData> = {
  data: TData;
  repeats: EndpointsPairRepeats;
};

export function createEndpointsPairReporter<TData>(report: (data: TData, repeats?: EndpointsPairRepeats) => void) {
  const reportedPairs = new Set<string>();
  let currentPair: string | undefined;
  let lastSwitchTs: number | undefined;
  let pending: PendingSummary<TData> | undefined;
  let summaryTimeoutId: number | undefined;

  const flush = () => {
    if (summaryTimeoutId !== undefined) {
      window.clearTimeout(summaryTimeoutId);
      summaryTimeoutId = undefined;
    }

    if (!pending) {
      return;
    }

    const { data, repeats } = pending;
    pending = undefined;

    report(data, repeats);
  };

  const onPairUpdated = (p: { primary: string; secondary: string | undefined; data: TData }) => {
    const pair = `${p.primary} ${p.secondary ?? ""}`;

    if (pair === currentPair) {
      return;
    }

    const now = Date.now();
    const isAfterQuietInterval = lastSwitchTs === undefined || now - lastSwitchTs >= SUMMARY_INTERVAL;

    currentPair = pair;
    lastSwitchTs = now;

    // The summary timer can fire late in a background tab
    if (pending && now - pending.repeats.firstTs >= SUMMARY_INTERVAL) {
      flush();
    }

    if (!reportedPairs.has(pair)) {
      reportedPairs.add(pair);
      flush();
      report(p.data);
      return;
    }

    if (pending) {
      pending = {
        data: p.data,
        repeats: { ...pending.repeats, repeatCount: pending.repeats.repeatCount + 1, lastTs: now },
      };
      return;
    }

    if (isAfterQuietInterval) {
      report(p.data);
      return;
    }

    pending = { data: p.data, repeats: { repeatCount: 1, firstTs: now, lastTs: now } };
    summaryTimeoutId = window.setTimeout(flush, SUMMARY_INTERVAL);
  };

  return { onPairUpdated, flush };
}
