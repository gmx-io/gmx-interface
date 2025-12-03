import orderBy from "lodash/orderBy";

import { getChainName, getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListenner } from "lib/FallbackTracker/events";
import { RpcStats, RpcTracker } from "lib/rpc/RpcTracker";

import {
  metrics,
  RpcTrackerEndpointBannedEvent,
  RpcTrackerEndpointBlockGapTiming,
  RpcTrackerEndpointTiming,
  RpcTrackerUpdateEndpointsEvent,
} from ".";

export function subscribeForRpcTrackerMetrics(tracker: RpcTracker) {
  const cleanupBannedSubscription = addFallbackTrackerListenner(
    "endpointBanned",
    tracker.trackerKey,
    ({ endpoint, reason }) => {
      metrics.pushEvent<RpcTrackerEndpointBannedEvent>({
        event: "rpcTracker.endpoint.banned",
        isError: false,
        data: {
          chainId: tracker.params.chainId,
          chainName: getChainName(tracker.params.chainId),
          endpoint: endpoint,
          reason: reason,
        },
      });
    }
  );

  const cleanupEndpointsUpdatedSubscription = addFallbackTrackerListenner(
    "endpointsUpdated",
    tracker.trackerKey,
    (p) => {
      const { primary, fallbacks, endpointsStats } = p;

      const bestBlock = getBestBlock(endpointsStats);

      const primaryStats = endpointsStats.find((stat) => stat.endpoint === primary);
      const secondary = fallbacks[0];
      const secondaryStats = secondary ? endpointsStats.find((stat) => stat.endpoint === secondary) : undefined;

      metrics.pushEvent<RpcTrackerUpdateEndpointsEvent>({
        event: "rpcTracker.endpoint.updated",
        isError: false,
        data: {
          isOld: false,
          chainId: tracker.params.chainId,
          chainName: getChainName(tracker.params.chainId),
          primary: getProviderNameFromUrl(primary),
          secondary: secondary ? getProviderNameFromUrl(secondary) : "none",
          primaryBlockGap: getBlockGap(bestBlock, primaryStats),
          secondaryBlockGap: getBlockGap(bestBlock, secondaryStats),
        },
      });
    }
  );

  const cleanupTrackingFinishedSubscription = addFallbackTrackerListenner(
    "trackingFinished",
    tracker.trackerKey,
    ({ endpointsStats }) => {
      const bestBlock = getBestBlock(endpointsStats);

      endpointsStats.forEach((endpointStats: RpcStats) => {
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
          });
        }
      });
    }
  );

  return () => {
    cleanupBannedSubscription();
    cleanupEndpointsUpdatedSubscription();
    cleanupTrackingFinishedSubscription();
  };
}

const getBestBlock = (endpointsStats: RpcStats[]): number | undefined => {
  return orderBy(endpointsStats, [(stat) => stat.checkResults?.[0]?.stats?.blockNumber ?? 0], ["desc"])[0]
    ?.checkResults?.[0]?.stats?.blockNumber;
};

const getBlockGap = (bestBlock: number | undefined, endpointStats: RpcStats | undefined): number | "unknown" => {
  if (!endpointStats) {
    return "unknown";
  }

  const blockNumber = endpointStats?.checkResults?.[0]?.stats?.blockNumber;

  if (typeof blockNumber !== "number" || !bestBlock) {
    return "unknown";
  }

  return bestBlock - blockNumber;
};
