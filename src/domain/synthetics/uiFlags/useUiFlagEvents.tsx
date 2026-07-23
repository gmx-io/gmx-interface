import { useCallback, useMemo, useState } from "react";

import { UI_FLAG_EVENTS_DISMISSED_KEY_PREFIX } from "config/localStorage";
import { UiFlagEventData, getUiFlagEventDismissCooldown, uiFlagEventsData } from "config/uiFlagEvents";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";

export type ActiveUiFlagEvent = {
  data: UiFlagEventData;
  dismiss: () => void;
};

function getLocalStorageKey(eventId: string) {
  return `${UI_FLAG_EVENTS_DISMISSED_KEY_PREFIX}-${eventId}`;
}

function isDismissedByCooldown(eventId: string, cooldownMs: number): boolean {
  const raw = localStorage.getItem(getLocalStorageKey(eventId));
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;

  return Date.now() - dismissedAt < cooldownMs;
}

function persistDismissal(eventId: string) {
  localStorage.setItem(getLocalStorageKey(eventId), String(Date.now()));
}

export function useUiFlagEvents(): ActiveUiFlagEvent[] {
  const { uiFlags } = useUiFlagsRequest();
  const [dismissalVersion, setDismissalVersion] = useState(0);

  const bumpVersion = useCallback(() => setDismissalVersion((v) => v + 1), []);

  return useMemo<ActiveUiFlagEvent[]>(() => {
    if (!uiFlags) return [];

    return uiFlagEventsData
      .filter((event) => uiFlags[event.flagName]?.enabled === true)
      .filter((event) => !isDismissedByCooldown(event.id, getUiFlagEventDismissCooldown(event)))
      .map((event) => ({
        data: event,
        dismiss: () => {
          persistDismissal(event.id);
          bumpVersion();
        },
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiFlags, dismissalVersion, bumpVersion]);
}
