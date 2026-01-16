import { isDevelopment } from "config/env";
import { DEBUG_METRICS_KEY } from "config/localStorage";
import type { ErrorEvent } from "lib/metrics/types";
import type { BatchReportItem, CounterPayload, EventPayload, TimingPayload } from "lib/oracleKeeperFetcher";
import { Storage } from "lib/storage/Storage";

export enum MetricsDebugFlags {
  LogFreshnessMetrics = "LogFreshnessMetrics",
  LogTimings = "LogTimings",
  LogEvents = "LogEvents",
  LogBatchItems = "LogBatchItems",
  LogQueueState = "LogQueueState",
  LogCounters = "LogCounters",
  LogErrors = "LogErrors",
}

type MetricsDebugState = {
  [MetricsDebugFlags.LogFreshnessMetrics]: boolean;
  [MetricsDebugFlags.LogTimings]: boolean;
  [MetricsDebugFlags.LogEvents]: boolean;
  [MetricsDebugFlags.LogBatchItems]: boolean;
  [MetricsDebugFlags.LogQueueState]: boolean;
  [MetricsDebugFlags.LogCounters]: boolean;
  [MetricsDebugFlags.LogErrors]: boolean;
};

class MetricsDebug {
  storage: Storage<MetricsDebugState>;

  constructor() {
    this.storage = new Storage<MetricsDebugState>(DEBUG_METRICS_KEY);
  }

  log(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.log(`[Metrics]`, ...message);
  }

  warn(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[Metrics]`, ...message);
  }

  getFlag(flag: MetricsDebugFlags): boolean | undefined {
    return this.storage.get(flag);
  }

  setFlag(flag: MetricsDebugFlags, value: boolean): void {
    this.storage.set(flag, value);
  }

  logBatchItem(payload: BatchReportItem[]): void {
    if (this.getFlag(MetricsDebugFlags.LogBatchItems)) {
      this.log("Push Batch Items", payload);
    }
  }

  logSendBatchItems(payload: BatchReportItem[]): void {
    if (this.getFlag(MetricsDebugFlags.LogBatchItems)) {
      this.log("Send Batch Items:", payload);
    }
  }

  logBatchItemsSent(payload: BatchReportItem[]): void {
    if (this.getFlag(MetricsDebugFlags.LogBatchItems)) {
      this.log("Batch Items Sent:", payload.length);
    }
  }

  logEvent(payload: EventPayload): void {
    if (this.getFlag(MetricsDebugFlags.LogEvents)) {
      this.log("Event", payload.event, payload);
    }
  }

  logError(payload: ErrorEvent): void {
    if (this.getFlag(MetricsDebugFlags.LogErrors)) {
      this.log("Error Event", payload.data.errorMessage, payload);
    }
  }

  logTiming(payload: TimingPayload): void {
    if (this.getFlag(MetricsDebugFlags.LogFreshnessMetrics) && payload.event.startsWith("freshness.")) {
      this.log(`${payload.event} ${payload.time}ms`, payload);
      return;
    }

    if (this.getFlag(MetricsDebugFlags.LogTimings)) {
      this.log("Timing", `${payload.event} ${payload.time}ms`, payload);
    }
  }

  logCounter(payload: CounterPayload): void {
    if (this.getFlag(MetricsDebugFlags.LogCounters)) {
      this.log("Counter", payload.event, payload);
    }
  }

  logQueueState(message: string): void {
    if (this.getFlag(MetricsDebugFlags.LogQueueState)) {
      this.log("Queue State:", message);
    }
  }
}

export const _debugMetrics = isDevelopment() ? new MetricsDebug() : undefined;
