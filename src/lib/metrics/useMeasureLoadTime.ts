import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
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
import { useEffect } from "react";

const MEASUREMENTS: {
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
      }, timeout);
    },
    [measure, metricType, skip, timeout]
  );

  useEffect(
    function failedEff() {
      if (error && !measure.done && measure.requestId) {
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
        measure.done = true;
      }
    },
    [error, measure, metricType]
  );

  useEffect(
    function successEff() {
      if (isLoaded && !measure.done && measure.requestId) {
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
    [isLoaded, measure.done, measure.timeoutId, measure.requestId, measure, metricType]
  );
}
