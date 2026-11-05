import type { OrderMetricId } from "./types";

type SubmissionStatus = "waiting" | "sent" | "failed";

type PendingCreations = {
  metricId: OrderMetricId;
  creationKeys: string[];
  status: SubmissionStatus;
};

const MATCH_PRIORITY: SubmissionStatus[] = ["sent", "waiting", "failed"];

let pendingCreations: PendingCreations[] = [];
const createdOrders = new Map<string, OrderMetricId>();

export function pruneOrderTracking(cachedMetricIds: Set<string>) {
  pendingCreations = pendingCreations.filter((pending) => cachedMetricIds.has(pending.metricId));

  createdOrders.forEach((metricId, orderKey) => {
    if (!cachedMetricIds.has(metricId)) {
      createdOrders.delete(orderKey);
    }
  });
}

export function expectOrderCreations(metricId: OrderMetricId, creationKeys: string[]) {
  if (creationKeys.length > 0) {
    pendingCreations.push({ metricId, creationKeys: [...creationKeys], status: "waiting" });
  }
}

function setSubmissionStatus(metricId: OrderMetricId, status: SubmissionStatus) {
  pendingCreations.forEach((pending) => {
    if (pending.metricId === metricId) {
      pending.status = status;
    }
  });
}

export function markOrderCreationsSent(metricId: OrderMetricId) {
  setSubmissionStatus(metricId, "sent");
}

export function markOrderCreationsFailed(metricId: OrderMetricId) {
  setSubmissionStatus(metricId, "failed");
}

export function trackCreatedOrder(
  creationKey: string,
  orderKey: string
): { metricId: OrderMetricId; hasMoreCreations: boolean } | undefined {
  const candidates = pendingCreations.filter((pending) => pending.creationKeys.includes(creationKey));
  const pending = MATCH_PRIORITY.map((status) => candidates.find((candidate) => candidate.status === status)).find(
    Boolean
  );

  if (!pending) {
    return undefined;
  }

  pending.creationKeys.splice(pending.creationKeys.indexOf(creationKey), 1);
  createdOrders.set(orderKey, pending.metricId);

  if (pending.creationKeys.length === 0) {
    pendingCreations = pendingCreations.filter((item) => item !== pending);
  }

  return { metricId: pending.metricId, hasMoreCreations: pending.creationKeys.length > 0 };
}

export function takeCreatedOrderMetricId(orderKey: string): OrderMetricId | undefined {
  const metricId = createdOrders.get(orderKey);
  createdOrders.delete(orderKey);

  return metricId;
}
