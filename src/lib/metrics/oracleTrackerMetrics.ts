import { getChainName, getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListenner } from "lib/FallbackTracker/events";
import { OracleKeeperFallbackTracker } from "lib/oracleKeeperFetcher/OracleFallbackTracker";

import { metrics, OracleKeeperEndpointBannedEvent, OracleKeeperUpdateEndpointsEvent } from ".";

export function subscribeForOracleTrackerMetrics(tracker: OracleKeeperFallbackTracker) {
  const cleanupBannedSubscription = addFallbackTrackerListenner(
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

  const cleanupEndpointsUpdatedSubscription = addFallbackTrackerListenner(
    "endpointsUpdated",
    tracker.trackerKey,
    (p) => {
      const { primary, secondary } = p;

      metrics.pushEvent<OracleKeeperUpdateEndpointsEvent>({
        event: "oracleKeeper.endpoint.updated",
        isError: false,
        data: {
          chainId: tracker.params.chainId,
          chainName: getChainName(tracker.params.chainId),
          primary: getProviderNameFromUrl(primary),
          secondary: getProviderNameFromUrl(secondary),
        },
      });
    }
  );

  return () => {
    cleanupBannedSubscription();
    cleanupEndpointsUpdatedSubscription();
  };
}
