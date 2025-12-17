import { getChainName, getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { OracleKeeperFallbackTracker } from "lib/oracleKeeperFetcher/OracleFallbackTracker";

import { metrics, OracleKeeperEndpointBannedEvent, OracleKeeperUpdateEndpointsEvent } from ".";

export function subscribeForOracleTrackerMetrics(tracker: OracleKeeperFallbackTracker) {
  const cleanupBannedSubscription = addFallbackTrackerListener(
    "endpointBanned",
    tracker.trackerKey,
    ({ endpoint, reason }) => {
      metrics.pushEvent<OracleKeeperEndpointBannedEvent>({
        event: "oracleKeeper.endpoint.banned",
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

  const cleanupEndpointsUpdatedSubscription = addFallbackTrackerListener(
    "endpointsUpdated",
    tracker.trackerKey,
    (p) => {
      const { primary, fallbacks } = p;
      const secondary = fallbacks[0];

      metrics.pushEvent<OracleKeeperUpdateEndpointsEvent>({
        event: "oracleKeeper.endpoint.updated",
        isError: false,
        data: {
          chainId: tracker.params.chainId,
          chainName: getChainName(tracker.params.chainId),
          primary: getProviderNameFromUrl(primary),
          secondary: secondary ? getProviderNameFromUrl(secondary) : "none",
        },
      });
    }
  );

  return () => {
    cleanupBannedSubscription();
    cleanupEndpointsUpdatedSubscription();
  };
}
