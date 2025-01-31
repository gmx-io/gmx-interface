import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { metrics } from "lib/metrics";
import { parseError } from "lib/parseError";
import {
  LoadingFailedEvent,
  LoadingStartEvent,
  LoadingSuccessEvent,
  LoadingTimeoutEvent,
  MeasureMetricType,
} from "lib/metrics/types";
import { getRequestId } from "lib/metrics/utils";
import { useEffect } from "react";

const measurementByMetricType: {
  [key: string]: {
    requestId: string;
    done?: boolean;
    timeoutId?: number;
    location: string;
    isFirstTimeLoading: boolean;
  };
} = {};
const fromLocalStorage = false;

export function useMeasureLoadTime({
  metricType,
  isLoaded,
  error,
  timeout = DATA_LOAD_TIMEOUT_FOR_METRICS,
  skipAfterTimeout,
  skip,
}: {
  isLoaded: boolean;
  error: Error | undefined;
  metricType: MeasureMetricType;
  timeout?: number;
  skipAfterTimeout?: boolean;
  skip?: boolean;
}) {
  measurementByMetricType[metricType] = measurementByMetricType[metricType] || {};
  const measure = measurementByMetricType[metricType];

  useEffect(
    function onLocationChangeEff() {
      if (skip) {
        return;
      }

      if (!measure.location) {
        measure.location = window.location.hash;
      }

      return () => {
        if (measure.requestId && window.location.hash !== measure.location) {
          clearTimeout(measure.timeoutId);
          measure.done = true;
          // reset timer
          metrics.getTime(metricType, true, fromLocalStorage);
        }
      };
    },
    [measure, metricType, skip]
  );

  useEffect(
    function startEff() {
      if (skip || measure.requestId || measure.done) {
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

        if (skipAfterTimeout) {
          measure.done = true;
        }
      }, timeout);
    },
    [measure, metricType, skip, skipAfterTimeout, timeout]
  );

  useEffect(
    function failedEff() {
      if (!skip && error && !measure.done && measure.requestId) {
        clearTimeout(measure.timeoutId);

        const errorData = parseError(error);

        metrics.pushEvent<LoadingFailedEvent>({
          event: `${metricType}.failed`,
          isError: true,
          time: metrics.getTime(metricType, true, fromLocalStorage),
          data: {
            ...errorData,
            requestId: measure.requestId,
          },
        });
        measure.done = true;
      }
    },
    [error, measure, metricType, skip]
  );

  useEffect(
    function successEff() {
      if (!skip && isLoaded && !measure.done && measure.requestId) {
        clearTimeout(measure.timeoutId);

        metrics.pushEvent<LoadingSuccessEvent>({
          event: `${metricType}.success`,
          isError: false,
          time: metrics.getTime(metricType, true, fromLocalStorage),
          data: {
            requestId: measure.requestId,
          },
        });
        measure.done = true;
      }
    },
    [isLoaded, measure.done, measure.timeoutId, measure.requestId, measure, metricType, skip]
  );
}
