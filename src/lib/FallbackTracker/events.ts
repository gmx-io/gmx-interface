import { EndpointStats } from "./FallbackTracker";

// Incomming
export const FALLBACK_TRACKER_TRIGGER_FAILURE_EVENT_KEY = "FALLBACK_TRACKER_TRIGGER_FAILURE";
export type EndpointFailureDetail = {
  endpoint: string;
  trackerKey: string;
};

// Outgoing
export const FALLBACK_TRACKER_ENDPOINTS_UPDATED_EVENT_KEY = "FALLBACK_TRACKER_ENDPOINTS_UPDATED";
export type EndpointsUpdatedDetail = {
  trackerKey: string;
  primary: string;
  secondary: string;
  endpointsStats: EndpointStats<any>[];
};

export function emitFallbackTrackerEndpointFailure({ endpoint, trackerKey }: EndpointFailureDetail) {
  globalThis.dispatchEvent(
    new CustomEvent(FALLBACK_TRACKER_TRIGGER_FAILURE_EVENT_KEY, { detail: { endpoint, trackerKey } })
  );
}

export function emitFallbackTrackerEndpointsUpdated({
  trackerKey,
  primary,
  secondary,
  endpointsStats,
}: EndpointsUpdatedDetail) {
  globalThis.dispatchEvent(
    new CustomEvent(FALLBACK_TRACKER_ENDPOINTS_UPDATED_EVENT_KEY, {
      detail: { trackerKey, primary, secondary, endpointsStats },
    })
  );
}
