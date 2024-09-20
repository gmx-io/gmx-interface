import { MetricEventParams } from "./Metrics";

export const METRIC_WINDOW_EVENT_NAME = "send-metric";

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
