import { useEffect, useRef } from "react";

import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { parseError } from "lib/errors";
import { metrics } from "lib/metrics";
import {
  FailedDataSource,
  LoadingStartEvent,
  LoadingSuccessEvent,
  LoadingTimeoutEvent,
  MeasureMetricType,
} from "lib/metrics/types";
import { getRequestId } from "lib/metrics/utils";

import { DeferredLoadFailure, deferLoadFailure } from "./deferLoadFailure";

const measurementByMetricType: {
  [key: string]: {
    requestId: string;
    done?: boolean;
    timeoutId?: number;
    location: string;
    isFirstTimeLoading: boolean;
    pendingFailure?: DeferredLoadFailure;
  };
} = {};
const fromLocalStorage = false;

export function useMeasureLoadTime({
  metricType,
  isLoaded,
  isPageLoaded = isLoaded,
  error,
  failedDataSource,
  timeout = DATA_LOAD_TIMEOUT_FOR_METRICS,
  skipAfterTimeout,
  skip,
  data,
}: {
  isLoaded: boolean;
  isPageLoaded?: boolean;
  error: Error | undefined;
  failedDataSource?: FailedDataSource;
  metricType: MeasureMetricType;
  timeout?: number;
  skipAfterTimeout?: boolean;
  skip?: boolean;
  data?: Record<string, any>;
}) {
  measurementByMetricType[metricType] = measurementByMetricType[metricType] || {};
  const measure = measurementByMetricType[metricType];

  const dataRef = useRef(data);
  dataRef.current = data;

  const failedDataSourceRef = useRef(failedDataSource);
  failedDataSourceRef.current = failedDataSource;

  useEffect(
    function onLocationChangeEff() {
      if (skip) {
        return;
      }

      if (!measure.location) {
        measure.location = window.location.pathname;
      }

      return () => {
        if (measure.requestId && window.location.pathname !== measure.location) {
          clearTimeout(measure.timeoutId);
          measure.pendingFailure?.finish("pageLeft");
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
          ...dataRef.current,
        },
      });

      measure.timeoutId = window.setTimeout(() => {
        metrics.pushEvent<LoadingTimeoutEvent>({
          event: `${metricType}.timeout`,
          isError: true,
          time: metrics.getTime(metricType, false, fromLocalStorage),
          data: {
            requestId: measure.requestId,
            ...dataRef.current,
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

        const source = failedDataSourceRef.current;

        measure.done = true;
        measure.pendingFailure = deferLoadFailure(
          {
            event: `${metricType}.failed`,
            isError: true,
            time: metrics.getTime(metricType, true, fromLocalStorage),
            data: {
              ...parseError(error),
              requestId: measure.requestId,
              ...dataRef.current,
              failedSource: source?.id,
              failedHost: source?.host,
            },
          },
          () => {
            measure.pendingFailure = undefined;
          }
        );
      }
    },
    [error, measure, metricType, skip]
  );

  useEffect(
    function successEff() {
      if (measure.pendingFailure) {
        if (isPageLoaded) {
          measure.pendingFailure.onLoaded();
        }

        return;
      }

      if (!isLoaded) {
        return;
      }

      if (!skip && !measure.done && measure.requestId) {
        clearTimeout(measure.timeoutId);

        metrics.pushEvent<LoadingSuccessEvent>({
          event: `${metricType}.success`,
          isError: false,
          time: metrics.getTime(metricType, true, fromLocalStorage),
          data: {
            requestId: measure.requestId,
            ...dataRef.current,
          },
        });
        measure.done = true;
      }
    },
    [isLoaded, isPageLoaded, measure.done, measure.timeoutId, measure.requestId, measure, metricType, skip]
  );
}
