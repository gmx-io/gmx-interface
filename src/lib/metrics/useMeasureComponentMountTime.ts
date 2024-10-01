import { useEffect } from "react";
import { getRequestId, LoadingSuccessEvent, MeasureMetricType, metrics } from ".";

const MEASUREMENTS: {
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
        MEASUREMENTS[metricType]?.done
      ) {
        return;
      }

      if (!MEASUREMENTS[metricType]) {
        MEASUREMENTS[metricType] = {
          requestId: getRequestId(),
          inited: true,
        };
      }

      metrics.pushEvent<LoadingSuccessEvent>({
        event: `${metricType}.success`,
        isError: false,
        time: performance.now(),
        data: {
          requestId: MEASUREMENTS[metricType].requestId,
        },
      });

      MEASUREMENTS[metricType].done = true;
    },
    [metricType, onlyForLocation]
  );
}
