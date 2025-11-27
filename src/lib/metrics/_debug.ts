import { isDevelopment } from "config/env";
import { DEBUG_METRICS_KEY } from "config/localStorage";
import { ErrorEvent } from "lib/metrics/types";
import { BatchReportItem, CounterPayload, EventPayload, TimingPayload } from "lib/oracleKeeperFetcher";

export enum MetricsDebugFlags {
  LogFreshnessMetrics = "LogFreshnessMetrics",
  LogTimings = "LogTimings",
  LogEvents = "LogEvents",
  LogBatchItems = "LogBatchItems",
  LogQueueState = "LogQueueState",
  LogCounters = "LogCounters",
  LogErrors = "LogErrors",
}

export class MetricsDebug {
  private flags: Partial<Record<MetricsDebugFlags, boolean>>;

  constructor() {
    this.flags = this.loadFlags();
  }

  log(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.log(`[Metrics]`, ...message);
  }

  warn(...message: any[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[Metrics]`, ...message);
  }

  loadFlags(): Partial<Record<MetricsDebugFlags, boolean>> {
    try {
      const stored = localStorage.getItem(DEBUG_METRICS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      //
    }

    return {};
  }

  private saveFlags(): void {
    try {
      localStorage.setItem(DEBUG_METRICS_KEY, JSON.stringify(this.flags));
    } catch (error) {
      //
    }
  }

  getFlag(flag: MetricsDebugFlags): boolean | undefined {
    return this.flags[flag];
  }

  setFlag(flag: MetricsDebugFlags, value: boolean): void {
    this.flags[flag] = value;
    this.saveFlags();
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
      this.log("Event", payload);
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
      this.log("Timing", payload);
    }
  }

  logCounter(payload: CounterPayload): void {
    if (this.getFlag(MetricsDebugFlags.LogCounters)) {
      this.log("Counter", payload);
    }
  }

  logQueueState(message: string): void {
    if (this.getFlag(MetricsDebugFlags.LogQueueState)) {
      this.log("Queue State:", message);
    }
  }
}

export const _debugMetrics = isDevelopment() ? new MetricsDebug() : undefined;
