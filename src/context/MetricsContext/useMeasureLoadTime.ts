import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { useEffect } from "react";
import { useLatest } from "react-use";
import { useMetrics } from "./MetricsContext";
import { MetricEventType } from "./types";
import { getRequestId } from "./utils";

const MEASUREMENTS: { [key: string]: { requestId: string; sent?: boolean; timeout?: NodeJS.Timeout } } = {};

export function useMeasureLoadTime({
  isLoaded,
  error,
  startEvent,
  successEvent,
  failEvent,
  timeoutEvent,
  timeout = DATA_LOAD_TIMEOUT_FOR_METRICS,
  timerLabel,
  metricData,
}: {
  isLoaded: boolean;
  error: Error | undefined;
  startEvent: MetricEventType;
  successEvent: MetricEventType;
  failEvent: MetricEventType;
  timeoutEvent: MetricEventType;
  timeout?: number;
  timerLabel: string;
  metricData?: any;
}) {
  const metrics = useMetrics();

  const metricsRef = useLatest(metrics);
  const metricDataRef = useLatest(metricData);

  MEASUREMENTS[timerLabel] = MEASUREMENTS[timerLabel] || {};
  const measure = MEASUREMENTS[timerLabel];

  useEffect(() => {
    if (measure.timeout || measure.sent) {
      return;
    }

    measure.requestId = getRequestId();
    metricsRef.current.startTimer(timerLabel);

    metricsRef.current.sendMetric({
      event: startEvent,
      isError: false,
      data: {
        ...(metricDataRef.current || {}),
        requestId: measure.requestId,
      },
    });

    measure.timeout = setTimeout(() => {
      metricsRef.current.sendMetric({
        event: timeoutEvent,
        isError: true,
        time: metricsRef.current.getTime(timerLabel),
        data: {
          ...(metricDataRef.current || {}),
          requestId: measure.requestId,
        },
      });
    }, timeout);
  }, [measure, metricDataRef, metricsRef, startEvent, timeout, timeoutEvent, timerLabel]);

  useEffect(() => {
    if (error && !measure.sent) {
      clearTimeout(measure.timeout);

      metrics.sendMetric({
        event: failEvent,
        isError: true,
        time: metrics.getTime(timerLabel, true),
        data: {
          ...(metricDataRef.current || {}),
          errorMessage: error.message,
          requestId: measure.requestId,
        },
      });
      measure.sent = true;
    }
  }, [error, failEvent, measure, metricDataRef, metrics, timerLabel]);

  useEffect(() => {
    if (isLoaded && !measure.sent) {
      clearTimeout(measure.timeout);

      metrics.sendMetric({
        event: successEvent,
        isError: false,
        time: metrics.getTime(timerLabel, true),
        data: {
          ...(metricDataRef.current || {}),
          requestId: measure.requestId,
        },
      });
      measure.sent = true;
    }
  }, [
    metricDataRef,
    metrics,
    isLoaded,
    successEvent,
    timerLabel,
    measure.sent,
    measure.timeout,
    measure.requestId,
    measure,
  ]);
}
