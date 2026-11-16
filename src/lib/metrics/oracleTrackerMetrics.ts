import { getChainName, getProviderNameFromUrl } from "config/rpc";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { OracleKeeperFallbackTracker } from "lib/oracleKeeperFetcher/OracleFallbackTracker";

import { metrics, OracleKeeperEndpointBannedEvent, OracleKeeperUpdateEndpointsEvent } from ".";
import { createEndpointsPairReporter } from "./endpointsPairReporter";

export function subscribeForOracleTrackerMetrics(tracker: OracleKeeperFallbackTracker) {
  const endpointsPairReporter = createEndpointsPairReporter<OracleKeeperUpdateEndpointsEvent["data"]>(
    (data, repeats) => {
      metrics.pushEvent<OracleKeeperUpdateEndpointsEvent>({
        event: "oracleKeeper.endpoint.updated",
        isError: false,
        data: { ...data, ...repeats },
      });
    }
  );

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
      const secondary: string | undefined = fallbacks[0];

      endpointsPairReporter.onPairUpdated({
        primary,
        secondary,
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
    endpointsPairReporter.flush();
    cleanupBannedSubscription();
    cleanupEndpointsUpdatedSubscription();
  };
}
