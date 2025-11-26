import { EndpointStats } from "./FallbackTracker";

export type FallbackTrackerEventsTypes = {
  // Incomming
  triggerFailure: {
    endpoint: string;
    trackerKey: string;
  };
  // Outgoing
  updateEndpoints: {
    trackerKey: string;
    primary: string;
    secondary: string;
    endpointsStats: EndpointStats<any>[];
  };
  trackFinished: {
    trackerKey: string;
  };
};

export type FallbackTrackerEventName = keyof FallbackTrackerEventsTypes;

export const fallbackTrackerEventKeys: Record<FallbackTrackerEventName, string> = {
  triggerFailure: "FALLBACK_TRACKER_TRIGGER_FAILURE",
  updateEndpoints: "FALLBACK_TRACKER_ENDPOINTS_UPDATED",
  trackFinished: "FALLBACK_TRACKER_TRACK_FINISHED",
};

export type EndpointFailureDetail = FallbackTrackerEventsTypes["triggerFailure"];

export function emitFallbackTrackerEndpointFailure({
  endpoint,
  trackerKey,
}: FallbackTrackerEventsTypes["triggerFailure"]) {
  globalThis.dispatchEvent(
    new CustomEvent(fallbackTrackerEventKeys.triggerFailure, { detail: { endpoint, trackerKey } })
  );
}

export function emitFallbackTrackerEndpointsUpdated({
  trackerKey,
  primary,
  secondary,
  endpointsStats,
}: FallbackTrackerEventsTypes["updateEndpoints"]) {
  globalThis.dispatchEvent(
    new CustomEvent(fallbackTrackerEventKeys.updateEndpoints, {
      detail: { trackerKey, primary, secondary, endpointsStats },
    })
  );
}

export function emitFallbackTrackerTrackFinished({ trackerKey }: FallbackTrackerEventsTypes["trackFinished"]) {
  globalThis.dispatchEvent(new CustomEvent(fallbackTrackerEventKeys.trackFinished, { detail: { trackerKey } }));
}

export function onFallbackTrackerEvent<TEvent extends FallbackTrackerEventName>(
  event: TEvent,
  listener: (data: FallbackTrackerEventsTypes[TEvent]) => void
) {
  const handler = (event: Event) => {
    const { detail } = event as CustomEvent<FallbackTrackerEventsTypes[TEvent]>;
    listener(detail);
  };

  globalThis.addEventListener(fallbackTrackerEventKeys[event], handler);

  return () => {
    globalThis.removeEventListener(fallbackTrackerEventKeys[event], handler);
  };
}
