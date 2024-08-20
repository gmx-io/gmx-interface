import { getIsFlagEnabled } from "config/ab";
import { DATA_LOAD_TIMEOUT_FOR_METRICS } from "config/ui";
import { useMetrics } from "context/MetricsContext/MetricsContext";
import { PositionsInfoData } from "domain/synthetics/positions";
import { useEffect } from "react";
import { useLatest } from "react-use";

function getRandomRequestId() {
  return Date.now().toString() + "_" + Math.trunc(Math.random() * 1000000).toString();
}

// Ensure we send metrics only once per session
let isSent = false;
let requestId: string;
let metricsTimeout: number;

export function usePositionListMetrics(positionsInfoData: PositionsInfoData | undefined) {
  const metrics = useMetrics();
  const metricsRef = useLatest(metrics);

  useEffect(() => {
    if (metricsTimeout || positionsInfoData || isSent) {
      return;
    }

    metricsRef.current.startTimer("positionsList");

    requestId = getRandomRequestId();

    metricsRef.current.sendMetric({
      event: "positionsListLoad.started",
      isError: false,
      data: {
        testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
        requestId,
      },
    });

    metricsTimeout = window.setTimeout(() => {
      metricsRef.current.sendMetric({
        event: "positionsListLoad.timeout",
        message: "Positions list was not loaded",
        isError: true,
        time: metricsRef.current.getTime("positionsList"),
        data: {
          testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
          requestId,
        },
      });
    }, DATA_LOAD_TIMEOUT_FOR_METRICS);
  }, [metricsRef, positionsInfoData]);

  useEffect(() => {
    if (positionsInfoData && !isSent) {
      clearTimeout(metricsTimeout);

      metricsRef.current.sendMetric({
        event: "positionsListLoad.success",
        isError: false,
        time: metricsRef.current.getTime("positionsList", true),
        data: {
          testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
          requestId,
        },
      });
      isSent = true;
    }
  }, [metricsRef, positionsInfoData]);
}
