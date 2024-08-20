import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { useEffect } from "react";
import { useLatest } from "react-use";
import { MetricData, MetricEventType } from "./types";
import { getRequestId } from "./utils";
import { metrics } from ".";
import { prepareErrorMetricData } from "./errorReporting";

const MEASUREMENTS: { [key: string]: { requestId: string; sent?: boolean; timeout?: number } } = {};

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
  metricData?: MetricData;
}) {
  const metricDataRef = useLatest(metricData);

  MEASUREMENTS[timerLabel] = MEASUREMENTS[timerLabel] || {};
  const measure = MEASUREMENTS[timerLabel];

  useEffect(() => {
    if (measure.timeout || measure.sent) {
      return;
    }

    measure.requestId = getRequestId();
    metrics.startTimer(timerLabel);

    metrics.pushEvent({
      event: startEvent,
      isError: false,
      data: {
        ...(metricDataRef.current || {}),
        requestId: measure.requestId,
      } as MetricData,
    });

    measure.timeout = window.setTimeout(() => {
      metrics.pushEvent({
        event: timeoutEvent,
        isError: true,
        time: metrics.getTime(timerLabel),
        data: {
          ...(metricDataRef.current || {}),
          requestId: measure.requestId,
        } as MetricData,
      });
    }, timeout);
  }, [measure, metricDataRef, startEvent, timeout, timeoutEvent, timerLabel]);

  useEffect(() => {
    if (error && !measure.sent) {
      clearTimeout(measure.timeout);

      const errorData = prepareErrorMetricData(error);

      metrics.pushEvent({
        event: failEvent,
        isError: true,
        time: metrics.getTime(timerLabel, true),
        data: {
          ...(metricDataRef.current || {}),
          ...errorData,
          requestId: measure.requestId,
        } as MetricData,
      });
      measure.sent = true;
    }
  }, [error, failEvent, measure, metricDataRef, timerLabel]);

  useEffect(() => {
    if (isLoaded && !measure.sent) {
      clearTimeout(measure.timeout);

      metrics.pushEvent({
        event: successEvent,
        isError: false,
        time: metrics.getTime(timerLabel, true),
        data: {
          ...(metricDataRef.current || {}),
          requestId: measure.requestId,
        } as MetricData,
      });
      measure.sent = true;
    }
  }, [metricDataRef, isLoaded, successEvent, timerLabel, measure.sent, measure.timeout, measure.requestId, measure]);
}
