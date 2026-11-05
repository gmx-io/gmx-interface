import orderBy from "lodash/orderBy";

import { isSolanaNetwork } from "config/chains";
import { getChainName, getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import type { EndpointStats } from "lib/FallbackTracker/FallbackTracker";
import type { RpcCheckStats, RpcTrackerObserver } from "lib/rpc/types";

import {
  metrics,
  RpcTrackerEndpointBannedEvent,
  RpcTrackerEndpointBlockGapTiming,
  RpcTrackerEndpointHealthEvent,
  RpcTrackerEndpointTiming,
  RpcTrackerUpdateEndpointsEvent,
} from ".";
import { createEndpointsPairReporter } from "./endpointsPairReporter";

export function subscribeForRpcTrackerMetrics(tracker: RpcTrackerObserver) {
  const isSolana = isSolanaNetwork(tracker.params.chainId);
  const progressFields = isSolana ? { progressUnit: "slot" as const } : {};
  const endpointHealth = new Map<string, boolean>();
  const endpointsPairReporter = createEndpointsPairReporter<RpcTrackerUpdateEndpointsEvent["data"]>((data, repeats) => {
    metrics.pushEvent<RpcTrackerUpdateEndpointsEvent>({
      event: "rpcTracker.endpoint.updated",
      isError: false,
      data: { ...data, ...repeats },
    });
  });

  const cleanupBannedSubscription = addFallbackTrackerListener(
    "endpointBanned",
    tracker.trackerKey,
    ({ endpoint, reason }) => {
      metrics.pushEvent<RpcTrackerEndpointBannedEvent>({
        event: "rpcTracker.endpoint.banned",
        isError: false,
        data: {
          chainId: tracker.params.chainId,
          chainName: getChainName(tracker.params.chainId),
          endpoint: getProviderNameFromUrl(endpoint),
          reason: reason,
        },
      });
    }
  );

  const cleanupEndpointsUpdatedSubscription = addFallbackTrackerListener(
    "endpointsUpdated",
    tracker.trackerKey,
    (p) => {
      const { primary, fallbacks, endpointsStats } = p;

      const secondary: string | undefined = fallbacks[0];

      const bestBlock = getBestBlock(endpointsStats);

      const primaryStats = endpointsStats.find((stat) => stat.endpoint === primary);
      const secondaryStats = secondary ? endpointsStats.find((stat) => stat.endpoint === secondary) : undefined;

      endpointsPairReporter.onPairUpdated({
        primary,
        secondary,
        data: {
          isOld: false,
          chainId: tracker.params.chainId,
          chainName: getChainName(tracker.params.chainId),
          primary: getProviderNameFromUrl(primary),
          secondary: secondary ? getProviderNameFromUrl(secondary) : "none",
          primaryBlockGap: getBlockGap(bestBlock, primaryStats),
          secondaryBlockGap: getBlockGap(bestBlock, secondaryStats),
          ...progressFields,
        },
      });
    }
  );

  const cleanupTrackingFinishedSubscription = addFallbackTrackerListener(
    "trackingFinished",
    tracker.trackerKey,
    ({ endpointsStats }) => {
      const bestBlock = getBestBlock(endpointsStats);

      const primary = tracker.fallbackTracker.state.primary;
      const fallbacks = tracker.fallbackTracker.state.fallbacks;
      const secondary = fallbacks[0];
      const relevantEndpoints = [primary, secondary].filter(Boolean);
      const relevantStats = endpointsStats.filter((stat) => relevantEndpoints.includes(stat.endpoint));

      relevantStats.forEach((endpointStats) => {
        const latestCheck = endpointStats.checkResults[0];
        if (isSolana && latestCheck) {
          const previousHealth = endpointHealth.get(endpointStats.endpoint);
          endpointHealth.set(endpointStats.endpoint, latestCheck.success);
          if (previousHealth !== latestCheck.success && (!latestCheck.success || previousHealth === false)) {
            metrics.pushEvent<RpcTrackerEndpointHealthEvent>({
              event: "rpcTracker.endpoint.health",
              isError: !latestCheck.success,
              data: {
                chainId: tracker.params.chainId,
                chainName: getChainName(tracker.params.chainId),
                endpoint: getProviderNameFromUrl(endpointStats.endpoint),
                isHealthy: latestCheck.success,
              },
            });
          }
        }
        const blockGap = getBlockGap(bestBlock, endpointStats);
        const responseTime = endpointStats.checkResults?.[0]?.stats?.responseTime;

        if (responseTime) {
          metrics.pushTiming<RpcTrackerEndpointTiming>("rpcTracker.endpoint.timing", responseTime, {
            endpoint: getProviderNameFromUrl(endpointStats.endpoint),
            chainId: tracker.params.chainId,
          });
        }

        if (typeof blockGap === "number") {
          metrics.pushTiming<RpcTrackerEndpointBlockGapTiming>("rpcTracker.endpoint.blockGap", blockGap, {
            endpoint: getProviderNameFromUrl(endpointStats.endpoint),
            chainId: tracker.params.chainId,
            ...progressFields,
          });
        }
      });
    }
  );

  return () => {
    endpointsPairReporter.flush();
    cleanupBannedSubscription();
    cleanupEndpointsUpdatedSubscription();
    cleanupTrackingFinishedSubscription();
  };
}

type RpcStats = EndpointStats<RpcCheckStats>;

const getProgress = (stats: RpcStats | undefined) => {
  const latest = stats?.checkResults[0]?.stats;
  return latest?.slot ?? latest?.blockNumber;
};

const getBestBlock = (endpointsStats: RpcStats[]): number | bigint | undefined => {
  return getProgress(orderBy(endpointsStats, [(stat) => getProgress(stat) ?? 0], ["desc"])[0]);
};

const getBlockGap = (
  bestBlock: number | bigint | undefined,
  endpointStats: RpcStats | undefined
): number | "unknown" => {
  if (!endpointStats) {
    return "unknown";
  }

  const blockNumber = getProgress(endpointStats);

  if (typeof bestBlock === "bigint" && typeof blockNumber === "bigint") {
    return Number(bestBlock - blockNumber);
  }
  return typeof bestBlock === "number" && typeof blockNumber === "number" && bestBlock
    ? bestBlock - blockNumber
    : "unknown";
};
