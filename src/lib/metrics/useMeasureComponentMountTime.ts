import { useEffect } from "react";

import { getRequestId, LoadingSuccessEvent, MeasureMetricType, metrics } from ".";

const measurementByMetricType: {
  [key: string]: { requestId: string; inited: boolean; done?: boolean };
} = {};

const INITIAL_LOCATION = window.location.hash;

export function useMeasureComponentMountTime({
  metricType,
  onlyForLocation,
}: {
  metricType: MeasureMetricType;
  onlyForLocation?: string;
}) {
  useEffect(
    function startEff() {
      if (
        typeof performance === "undefined" ||
        (onlyForLocation && onlyForLocation !== INITIAL_LOCATION) ||
        measurementByMetricType[metricType]?.done
      ) {
        return;
      }

      if (!measurementByMetricType[metricType]) {
        measurementByMetricType[metricType] = {
          requestId: getRequestId(),
          inited: true,
        };
      }

      metrics.pushEvent<LoadingSuccessEvent>({
        event: `${metricType}.success`,
        isError: false,
        time: performance.now(),
        data: {
          requestId: measurementByMetricType[metricType].requestId,
        },
      });

      measurementByMetricType[metricType].done = true;
    },
    [metricType, onlyForLocation]
  );
}
