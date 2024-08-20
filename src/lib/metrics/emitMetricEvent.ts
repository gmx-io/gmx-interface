import { METRIC_WINDOW_EVENT_NAME, MetricData, MetricEventType } from "./types";

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
    new CustomEvent(METRIC_WINDOW_EVENT_NAME, {
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
