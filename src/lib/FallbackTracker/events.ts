import { EndpointStats } from "./FallbackTracker";

export type FallbackTrackerEventsTypes = {
  // Incomming
  endpointFailure: {
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
  trackingFinished: {
    trackerKey: string;
  };
};

export type FallbackTrackerEventName = keyof FallbackTrackerEventsTypes;

export const fallbackTrackerEventKeys: Record<FallbackTrackerEventName, string> = {
  endpointFailure: "FALLBACK_TRACKER_ENDPOINT_FAILURE",
  endpointsUpdated: "FALLBACK_TRACKER_ENDPOINTS_UPDATED",
  trackingFinished: "FALLBACK_TRACKER_TRACK_FINISHED",
};

export function emitEndpointFailure({ endpoint, trackerKey }: FallbackTrackerEventsTypes["endpointFailure"]) {
  globalThis.dispatchEvent(
    new CustomEvent(fallbackTrackerEventKeys.endpointFailure, { detail: { endpoint, trackerKey } })
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
