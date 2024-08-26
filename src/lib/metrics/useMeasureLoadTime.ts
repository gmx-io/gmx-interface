import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { useEffect } from "react";
import { metrics } from "lib/metrics";
import { prepareErrorMetricData } from "lib/metrics/errorReporting";
import {
  LoadingFailedEvent,
  LoadingStartEvent,
  LoadingSuccessEvent,
  LoadingTimeoutEvent,
  MeasureMetricType,
} from "lib/metrics/types";
import { getRequestId } from "lib/metrics/utils";

const MEASUREMENTS: { [key: string]: { requestId: string; sent?: boolean; timeoutId?: number } } = {};
const fromLocalStorage = false;

export function useMeasureLoadTime({
  metricType,
  isLoaded,
  error,
  timeout = DATA_LOAD_TIMEOUT_FOR_METRICS,
  skip,
}: {
  isLoaded: boolean;
  error: Error | undefined;
  metricType: MeasureMetricType;
  timeout?: number;
  skip?: boolean;
}) {
  MEASUREMENTS[metricType] = MEASUREMENTS[metricType] || {};
  const measure = MEASUREMENTS[metricType];

  useEffect(() => {
    if (skip || measure.requestId || measure.sent) {
      return;
    }

    measure.requestId = getRequestId();
    metrics.startTimer(metricType, false);

    metrics.pushEvent<LoadingStartEvent>({
      event: `${metricType}.started`,
      isError: false,
      data: {
        requestId: measure.requestId,
      },
    });

    measure.timeoutId = window.setTimeout(() => {
      metrics.pushEvent<LoadingTimeoutEvent>({
        event: `${metricType}.timeout`,
        isError: true,
        time: metrics.getTime(metricType, false, fromLocalStorage),
        data: {
          requestId: measure.requestId,
        },
      });
    }, timeout);
  }, [measure, metricType, skip, timeout]);

  useEffect(() => {
    if (error && !measure.sent && measure.requestId) {
      clearTimeout(measure.timeoutId);

      const errorData = prepareErrorMetricData(error);

      metrics.pushEvent<LoadingFailedEvent>({
        event: `${metricType}.failed`,
        isError: true,
        time: metrics.getTime(metricType, true, fromLocalStorage),
        data: {
          ...errorData,
          requestId: measure.requestId,
        },
      });
      measure.sent = true;
    }
  }, [error, measure, metricType]);

  useEffect(() => {
    if (isLoaded && !measure.sent && measure.requestId) {
      clearTimeout(measure.timeoutId);

      metrics.pushEvent<LoadingSuccessEvent>({
        event: `${metricType}.success`,
        isError: false,
        time: metrics.getTime(metricType, true, fromLocalStorage),
        data: {
          requestId: measure.requestId,
        },
      });
      measure.sent = true;
    }
  }, [isLoaded, measure.sent, measure.timeoutId, measure.requestId, measure, metricType]);
}
