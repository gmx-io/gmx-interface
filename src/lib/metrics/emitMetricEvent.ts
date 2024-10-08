import { MetricEventParams } from "./Metrics";

export const METRIC_EVENT_DISPATCH_NAME = "send-metric";
export const METRIC_COUNTER_DISPATCH_NAME = "send-counter";
export const METRIC_TIMING_DISPATCH_NAME = "send-timing";

export function emitMetricEvent<T extends MetricEventParams = never>({ event, data, time, isError }: T) {
  globalThis.dispatchEvent(
    new CustomEvent(METRIC_EVENT_DISPATCH_NAME, {
      detail: {
        event: event,
        isError: isError,
        data: data,
        time: time,
      },
    })
  );
}

export function emitMetricCounter<T extends { event: string; data?: object } = never>({
  event,
  data,
}: {
  event: T["event"];
  data?: T["data"];
}) {
  globalThis.dispatchEvent(
    new CustomEvent(METRIC_COUNTER_DISPATCH_NAME, {
      detail: {
        event,
        data,
      },
    })
  );
}

export function emitMetricTiming<T extends { event: string; data?: object } = never>({
  event,
  time,
  data,
}: {
  event: T["event"];
  time: number;
  data?: T["data"];
}) {
  globalThis.dispatchEvent(
    new CustomEvent(METRIC_TIMING_DISPATCH_NAME, {
      detail: {
        event,
        time,
        data,
      },
    })
  );
}
