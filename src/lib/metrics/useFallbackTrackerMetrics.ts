import orderBy from "lodash/orderBy";
import { useEffect } from "react";

import { getProviderNameFromUrl } from "config/rpc";
import { onFallbackTracker } from "lib/FallbackTracker/events";
import { RpcStats } from "lib/rpc/RpcTracker";
import { getRpcTracker } from "lib/rpc/useRpcUrls";

import { metrics } from ".";

export function useFallbackTrackerMetrics() {
  useEffect(() => {
    onFallbackTracker("endpointBanned", ({ endpoint, trackerKey }) => {
      metrics.pushEvent({
        event: "fallbackTracker.endpoint.banned",
        isError: false,
        data: {
          key: trackerKey,
          endpoint: endpoint,
        },
      });
    });

    onFallbackTracker("endpointsUpdated", ({ trackerKey, primary, secondary, endpointsStats }) => {
      const rpcTracker = getRpcTracker(trackerKey);

      if (rpcTracker) {
        const bestBlock = orderBy(endpointsStats, [(stat) => stat.checkResult?.stats?.blockNumber ?? 0], ["desc"])[0]
          ?.checkResult?.stats?.blockNumber;

        const getBlockGap = (endpointStats: RpcStats | undefined): number | "unknown" => {
          if (!endpointStats) {
            return "unknown";
          }

          const blockNumber = endpointStats?.checkResult?.stats?.blockNumber;

          if (typeof blockNumber !== "number" || !bestBlock) {
            return "unknown";
          }

          return bestBlock - blockNumber;
        };

        const primaryStats = endpointsStats.find((stat) => stat.endpoint === primary);
        const secondaryStats = endpointsStats.find((stat) => stat.endpoint === secondary);

        metrics.pushEvent({
          event: "rpcTracker.updateEndpoints",
          isError: false,
          data: {
            // TODO: chainId?
            trackerKey,
            primary: getProviderNameFromUrl(primary),
            secondary: getProviderNameFromUrl(secondary),
            primaryBlockGap: getBlockGap(primaryStats),
            secondaryBlockGap: getBlockGap(secondaryStats),
          },
        });
      }
    });
  }, []);
}
