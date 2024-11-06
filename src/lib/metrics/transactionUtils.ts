import { emitMetricEvent } from "./emitMetricEvent";
import { prepareErrorMetricData } from "./errorReporting";
import { metrics } from "./Metrics";
import {
  OrderMetricId,
  OrderMetricData,
  OrderSimulatedEvent,
  OrderStage,
  OrderTxnFailedEvent,
  OrderSentEvent,
  OrderTxnSubmittedEvent,
} from "./types";

export function sendOrderSimulatedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderSimulatedMetric");
    return;
  }

  emitMetricEvent<OrderSimulatedEvent>({
    event: `${metricData.metricType}.simulated`,
    isError: false,
    time: metrics.getTime(metricId)!,
    data: metricData,
  });
}

export function sendOrderSimulationErrorMetric(metricId: OrderMetricId, error: Error) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderSimulationErrorMetric");
    return;
  }

  const errorData = prepareErrorMetricData(error);

  emitMetricEvent<OrderTxnFailedEvent>({
    event: `${metricData.metricType}.${OrderStage.Failed}`,
    isError: true,
    data: {
      errorContext: "simulation",
      ...(errorData || {}),
      ...metricData,
    },
  });
}

export function makeTxnSentMetricsHandler(metricId: OrderMetricId) {
  return () => {
    const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

    if (!metricData) {
      metrics.pushError("Order metric data not found", "makeTxnSentMetricsHandler");
      return;
    }

    metrics.startTimer(metricId);

    metrics.pushEvent<OrderSentEvent>({
      event: `${metricData.metricType}.sent`,
      isError: false,
      time: metrics.getTime(metricId)!,
      data: metricData,
    });

    return Promise.resolve();
  };
}

export function sendOrderTxnSubmittedMetric(metricId: OrderMetricId) {
  const metricData = metrics.getCachedMetricData<OrderMetricData>(metricId);

  if (!metricData) {
    metrics.pushError("Order metric data not found", "sendOrderTxnSubmittedMetric");
    return;
  }

  emitMetricEvent<OrderTxnSubmittedEvent>({
    event: `${metricData.metricType}.txnSubmitted`,
    isError: false,
    time: metrics.getTime(metricId)!,
    data: metricData,
  });
}
