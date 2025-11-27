import { EndpointStats } from "./FallbackTracker";

export type FallbackTrackerEventsTypes = {
  // Incomming
  reportEndpointFailure: {
    endpoint: string;
    trackerKey: string;
  };
  // Outgoing
  endpointsUpdated: {
    trackerKey: string;
    primary: string;
    secondary: string;
    endpointsStats: EndpointStats<any>[];
  };
  endpointBanned: {
    endpoint: string;
    trackerKey: string;
  };
  trackingFinished: {
    trackerKey: string;
  };
};

export type FallbackTrackerEventName = keyof FallbackTrackerEventsTypes;

export const fallbackTrackerEventKeys: Record<FallbackTrackerEventName, string> = {
  reportEndpointFailure: "FALLBACK_TRACKER_ENDPOINT_FAILURE",
  endpointsUpdated: "FALLBACK_TRACKER_ENDPOINTS_UPDATED",
  trackingFinished: "FALLBACK_TRACKER_TRACK_FINISHED",
  endpointBanned: "FALLBACK_TRACKER_ENDPOINT_BANNED",
};

export function emitReportEndpointFailure({
  endpoint,
  trackerKey,
}: FallbackTrackerEventsTypes["reportEndpointFailure"]) {
  globalThis.dispatchEvent(
    new CustomEvent(fallbackTrackerEventKeys.reportEndpointFailure, { detail: { endpoint, trackerKey } })
  );
}

export function emitEndpointBanned({ endpoint, trackerKey }: FallbackTrackerEventsTypes["endpointBanned"]) {
  globalThis.dispatchEvent(
    new CustomEvent(fallbackTrackerEventKeys.endpointBanned, { detail: { endpoint, trackerKey } })
  );
}

export function emitEndpointsUpdated({
  trackerKey,
  primary,
  secondary,
  endpointsStats,
}: FallbackTrackerEventsTypes["endpointsUpdated"]) {
  globalThis.dispatchEvent(
    new CustomEvent(fallbackTrackerEventKeys.endpointsUpdated, {
      detail: { trackerKey, primary, secondary, endpointsStats },
    })
  );
}

export function emitTrackingFinished({ trackerKey }: FallbackTrackerEventsTypes["trackingFinished"]) {
  globalThis.dispatchEvent(new CustomEvent(fallbackTrackerEventKeys.trackingFinished, { detail: { trackerKey } }));
}

export function onFallbackTracker<TEvent extends FallbackTrackerEventName>(
  eventName: TEvent,
  listener: (data: FallbackTrackerEventsTypes[TEvent]) => void
) {
  const handler = (event: Event) => {
    const { detail } = event as CustomEvent<FallbackTrackerEventsTypes[TEvent]>;
    listener(detail);
  };

  globalThis.addEventListener(fallbackTrackerEventKeys[eventName], handler);

  return () => {
    globalThis.removeEventListener(fallbackTrackerEventKeys[eventName], handler);
  };
}
