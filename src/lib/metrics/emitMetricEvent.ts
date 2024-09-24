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

export function emitMetricCounter({
  event,
  data,
}: {
  event: string;
  data?: Record<string, boolean | string | number>;
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

export function emitMetricTiming({
  event,
  time,
  data,
}: {
  event: string;
  time: number;
  data?: Record<string, boolean | string | number>;
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
