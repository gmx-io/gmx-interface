import type { MetricData, MetricEventType } from "./types";

export const METRIC_EVENT_NAME = "send-metric";

export function emitMetricEvent({
  event,
  data,
  time,
  isError,
  message,
}: {
  event: MetricEventType;
  data?: MetricData;
  time?: number;
  isError: boolean;
  message?: string;
}) {
  globalThis.dispatchEvent(
    new CustomEvent(METRIC_EVENT_NAME, {
      detail: {
        event: event,
        isError: isError,
        message: message,
        data: data,
        time: time,
      },
    })
  );
}
