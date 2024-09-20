import { MetricEventParams } from "./Metrics";

export const METRIC_WINDOW_EVENT_NAME = "send-metric";
export const METRIC_WINDOW_COUNTER_EVENT_NAME = "send-counter";

export function emitMetricEvent<T extends MetricEventParams = never>({ event, data, time, isError, isCounter }: T) {
  globalThis.dispatchEvent(
    new CustomEvent(METRIC_WINDOW_EVENT_NAME, {
      detail: {
        event: event,
        isError: isError,
        isCounter,
        data: data,
        time: time,
      },
    })
  );
}

export function emitMetricCounter({ event }: { event: string }) {
  globalThis.dispatchEvent(
    new CustomEvent(METRIC_WINDOW_COUNTER_EVENT_NAME, {
      detail: {
        event: event,
      },
    })
  );
}
