import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metrics } from "../Metrics";
import type { MulticallTimeoutEvent, OpenAppEvent } from "../types";

const MINUTE = 60 * 1000;

const extensionError = new Error("Cannot read properties of undefined (reading 'M_ID')");
const fetchError = new Error("Failed to fetch");
const EXTENSION_ERROR = `error ${extensionError.message}`;

const pushExtensionError = () => metrics.pushError(extensionError, "unhandledRejection");

const pushOpenApp = () =>
  metrics.pushEvent<OpenAppEvent>({ event: "openApp", isError: false, data: { isRefreshed: false } });

const pushMulticallTimeout = (rpcProvider: string) =>
  metrics.pushEvent<MulticallTimeoutEvent>({
    event: "multicall.timeout",
    isError: true,
    data: {
      metricType: "rpcTimeout",
      isInMainThread: true,
      requestType: "initial",
      rpcProvider,
      errorMessage: "multicall timeout",
    },
  });

function readReports() {
  return metrics.queue.flatMap((item) => {
    if (item.type !== "event") {
      return [];
    }

    const { errorMessage, rpcProvider, repeatCount, firstTs, lastTs } = item.payload.customFields;
    const name = [item.payload.event, rpcProvider ?? errorMessage].filter(Boolean).join(" ");

    return [repeatCount ? `${name} x${repeatCount} ${firstTs}-${lastTs}` : name];
  });
}

describe("Metrics repeated events", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    metrics.queue = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the first of identical events at once and folds its repeats into one summary per minute", () => {
    const steps: { time: number; push: () => void; isTimerLate?: boolean }[] = [
      { time: 0, push: pushExtensionError },
      { time: 1_000, push: pushExtensionError },
      { time: 2_000, push: pushExtensionError },
      // Other events are never folded
      { time: 3_000, push: pushOpenApp },
      { time: 3_500, push: pushOpenApp },
      // A new error goes after the repeats folded before it
      { time: 4_000, push: () => metrics.pushError(fetchError, "useFastMarketsInfoRequest") },
      // The summary is due a minute after the first folded repeat
      { time: 6_000, push: pushExtensionError },
      { time: 50_000, push: pushExtensionError },
      { time: 70_000, push: pushExtensionError },
      // The timer did not fire in a background tab, the next event sends the summary first
      { time: 200_000, push: pushExtensionError, isTimerLate: true },
      { time: 201_000, push: () => pushMulticallTimeout("arb1.arbitrum.io") },
      { time: 202_000, push: () => pushMulticallTimeout("arb1.arbitrum.io") },
      { time: 203_000, push: () => pushMulticallTimeout("arbitrum-one-rpc.publicnode.com") },
    ];

    for (const { time, push, isTimerLate } of steps) {
      if (isTimerLate) {
        vi.setSystemTime(time);
      } else {
        vi.advanceTimersByTime(time - Date.now());
      }

      push();
    }

    vi.advanceTimersByTime(2 * MINUTE);

    expect(readReports()).toEqual([
      EXTENSION_ERROR,
      "openApp",
      "openApp",
      `${EXTENSION_ERROR} x2 1000-2000`,
      "error Failed to fetch",
      `${EXTENSION_ERROR} x2 6000-50000`,
      `${EXTENSION_ERROR} x1 70000-70000`,
      EXTENSION_ERROR,
      "multicall.timeout arb1.arbitrum.io",
      "multicall.timeout arb1.arbitrum.io x1 202000-202000",
      "multicall.timeout arbitrum-one-rpc.publicnode.com",
    ]);
  });
});
