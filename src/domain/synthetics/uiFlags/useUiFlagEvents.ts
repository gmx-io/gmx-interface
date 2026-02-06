import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { getUiFlagEventDismissCooldown, uiFlagEventsData } from "config/uiFlagEvents";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import EventToast from "components/EventToast/EventToast";

function getLocalStorageKey(eventId: string) {
  return `ui-flag-event-dismissed-${eventId}`;
}

function isDismissedByCooldown(eventId: string, cooldownMs: number): boolean {
  const raw = localStorage.getItem(getLocalStorageKey(eventId));
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;

  return Date.now() - dismissedAt < cooldownMs;
}

function dismissEvent(eventId: string) {
  localStorage.setItem(getLocalStorageKey(eventId), String(Date.now()));
}

export function useUiFlagEvents() {
  const { uiFlags } = useUiFlagsRequest();
  const activeToastIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!uiFlags) return;

    for (const event of uiFlagEventsData) {
      const flagEnabled = uiFlags[event.flagName] === true;
      const toastId = `ui-flag-${event.id}`;
      const isShowing = activeToastIds.current.has(toastId);

      if (flagEnabled && !isShowing) {
        const cooldownMs = getUiFlagEventDismissCooldown(event);
        if (isDismissedByCooldown(event.id, cooldownMs)) continue;

        activeToastIds.current.add(toastId);
        toast.custom(
          (t) =>
            EventToast({
              event: {
                id: event.id,
                title: event.title as string,
                bodyText: event.content,
                endDate: "",
              },
              id: event.id,
              toast: t,
              variant: event.variant,
              onClick: () => {
                toast.dismiss(toastId);
                activeToastIds.current.delete(toastId);
                dismissEvent(event.id);
              },
            }),
          {
            id: toastId,
            style: {},
          }
        );
      } else if (!flagEnabled && isShowing) {
        toast.dismiss(toastId);
        activeToastIds.current.delete(toastId);
      }
    }
  }, [uiFlags]);
}
