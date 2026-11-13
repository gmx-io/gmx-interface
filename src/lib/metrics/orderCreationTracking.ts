import type { OrderMetricId } from "./types";

type PendingCreations = {
  metricId: OrderMetricId;
  creationKeys: string[];
  status: "waiting" | "sent";
  failedAt?: number;
};

const MAX_FAILED_SUBMISSION_MATCH_TIME = 1000 * 60;

export class OrderCreationTracker {
  private pendingCreations: PendingCreations[] = [];
  private createdOrders = new Map<string, OrderMetricId>();

  prune(cachedMetricIds: Set<string>) {
    this.pendingCreations = this.pendingCreations.filter((pending) => cachedMetricIds.has(pending.metricId));

    this.createdOrders.forEach((metricId, orderKey) => {
      if (!cachedMetricIds.has(metricId)) {
        this.createdOrders.delete(orderKey);
      }
    });
  }

  expect(metricId: OrderMetricId, creationKeys: string[]) {
    if (creationKeys.length > 0) {
      this.pendingCreations.push({ metricId, creationKeys: [...creationKeys], status: "waiting" });
    }
  }

  markSent(metricId: OrderMetricId) {
    this.pendingCreations.forEach((pending) => {
      if (pending.metricId === metricId) {
        pending.status = "sent";
      }
    });
  }

  markFailed(metricId: OrderMetricId) {
    const failedAt = Date.now();

    this.pendingCreations.forEach((pending) => {
      if (pending.metricId === metricId) {
        pending.failedAt = failedAt;
      }
    });
  }

  drop(metricId: OrderMetricId) {
    this.pendingCreations = this.pendingCreations.filter((pending) => pending.metricId !== metricId);
  }

  trackCreated(creationKey: string, orderKey: string): { metricId: OrderMetricId; hasMoreCreations: boolean } | undefined {
    const now = Date.now();

    this.pendingCreations = this.pendingCreations.filter(
      (pending) => pending.failedAt === undefined || now - pending.failedAt < MAX_FAILED_SUBMISSION_MATCH_TIME
    );

    const candidates = this.pendingCreations.filter((pending) => pending.creationKeys.includes(creationKey));
    const pending =
      candidates.find((candidate) => candidate.status === "sent" && candidate.failedAt === undefined) ?? candidates[0];

    if (!pending) {
      return undefined;
    }

    pending.creationKeys.splice(pending.creationKeys.indexOf(creationKey), 1);
    this.createdOrders.set(orderKey, pending.metricId);

    if (pending.creationKeys.length === 0) {
      this.pendingCreations = this.pendingCreations.filter((item) => item !== pending);
    }

    return { metricId: pending.metricId, hasMoreCreations: pending.creationKeys.length > 0 };
  }

  takeCreated(orderKey: string): OrderMetricId | undefined {
    const metricId = this.createdOrders.get(orderKey);
    this.createdOrders.delete(orderKey);

    return metricId;
  }
}
