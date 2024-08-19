import { useMetrics } from "context/MetricsContext/MetricsContext";
import type { SyntheticsState } from "../SyntheticsStateContextProvider";
import { useLatest } from "react-use";
import { useEffect, useRef, useState } from "react";
import { getIsFlagEnabled } from "config/ab";
import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { selectPositionsInfoData } from "../selectors/globalSelectors";

function getRandomRequestId() {
  return Date.now().toString() + "_" + Math.trunc(Math.random() * 1000000).toString();
}

export function usePositionListMetrics(state: SyntheticsState) {
  const metrics = useMetrics();
  const metricsRef = useLatest(metrics);
  const metricsTimeout = useRef<NodeJS.Timeout>();
  const requestIdRef = useRef<string>();

  const [isLoaded, setIsLoaded] = useState(false);

  const positionsInfoData = selectPositionsInfoData(state);

  useEffect(() => {
    if (metricsTimeout.current || positionsInfoData) {
      return;
    }

    metricsRef.current.startTimer("positionsList");

    requestIdRef.current = getRandomRequestId();

    metricsRef.current.sendMetric({
      event: "positionsListLoad.started",
      isError: false,
      data: {
        testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
        requestId: requestIdRef.current,
      },
    });

    metricsTimeout.current = setTimeout(() => {
      metricsRef.current.sendMetric({
        event: "positionsListLoad.timeout",
        message: "Positions list was not loaded",
        isError: true,
        time: metricsRef.current.getTime("positionsList"),
        data: {
          testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
          requestId: requestIdRef.current!,
        },
      });
    }, DATA_LOAD_TIMEOUT_FOR_METRICS);
  }, [metricsRef, positionsInfoData]);

  useEffect(() => {
    if (positionsInfoData && !isLoaded) {
      clearTimeout(metricsTimeout.current);

      metrics.sendMetric({
        event: "positionsListLoad.success",
        isError: false,
        time: metrics.getTime("positionsList"),
        data: {
          testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
          requestId: requestIdRef.current!,
        },
      });
      setIsLoaded(true);
    }
  }, [isLoaded, metrics, positionsInfoData]);
}
