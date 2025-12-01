import { safeAddGlobalListenner } from "lib/safeListenner/safeAddListenner";

import { EndpointStats } from "./FallbackTracker";

export type FallbackTrackerEventsTypes = {
  // Incomming
  reportEndpointFailure: {
    endpoint: string;
  };
  // Outgoing
  endpointsUpdated: {
    primary: string;
    secondary: string;
    endpointsStats: EndpointStats<any>[];
  };
  endpointBanned: {
    endpoint: string;
    reason: string;
  };
  trackingFinished: {
    trackerKey: string;
    endpointsStats: EndpointStats<any>[];
  };
};

export type FallbackTrackerEventDetail<TEvent extends FallbackTrackerEventName> = FallbackTrackerEventsTypes[TEvent] & {
  trackerKey: string;
};

export type FallbackTrackerEventName = keyof FallbackTrackerEventsTypes;

export const fallbackTrackerEventKeys: Record<FallbackTrackerEventName, string> = {
  reportEndpointFailure: "FALLBACK_TRACKER_ENDPOINT_FAILURE",
  endpointsUpdated: "FALLBACK_TRACKER_ENDPOINTS_UPDATED",
  trackingFinished: "FALLBACK_TRACKER_TRACK_FINISHED",
  endpointBanned: "FALLBACK_TRACKER_ENDPOINT_BANNED",
};

export function emitReportEndpointFailure(detail: FallbackTrackerEventDetail<"reportEndpointFailure">) {
  globalThis.dispatchEvent(new CustomEvent(fallbackTrackerEventKeys.reportEndpointFailure, { detail }));
}

export function emitEndpointBanned(detail: FallbackTrackerEventDetail<"endpointBanned">) {
  globalThis.dispatchEvent(new CustomEvent(fallbackTrackerEventKeys.endpointBanned, { detail }));
}

export function emitEndpointsUpdated(detail: FallbackTrackerEventDetail<"endpointsUpdated">) {
  globalThis.dispatchEvent(new CustomEvent(fallbackTrackerEventKeys.endpointsUpdated, { detail }));
}

export function emitTrackingFinished(detail: FallbackTrackerEventDetail<"trackingFinished">) {
  globalThis.dispatchEvent(new CustomEvent(fallbackTrackerEventKeys.trackingFinished, { detail }));
}

export function addFallbackTrackerListenner<TEvent extends FallbackTrackerEventName>(
  eventName: TEvent,
  trackerKey: string,
  listener: (data: FallbackTrackerEventDetail<TEvent>) => void
) {
  const handler = (event: Event) => {
    const { detail } = event as CustomEvent<FallbackTrackerEventDetail<TEvent>>;

    if (!detail || detail.trackerKey !== trackerKey) {
      return;
    }

    listener(detail);
  };

  safeAddGlobalListenner(fallbackTrackerEventKeys[eventName], handler);

  return () => {
    globalThis.removeEventListener(fallbackTrackerEventKeys[eventName], handler);
  };
}
