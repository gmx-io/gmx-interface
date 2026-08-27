import { useCallback, useEffect, useRef, useState } from "react";

import { metrics } from "lib/metrics";
import { AppUpdateCounter } from "lib/metrics/types";
import { AppUpdateStatus, getAppUpdateAction, SNOOZE_MS, UPDATE_CHECK_INTERVAL_MS } from "lib/pwa/appUpdateDecision";
import { useIsAutoReloadBlocked } from "lib/pwa/blockAutoReload";
import { fetchNetworkBuildId, getDocumentBuildId, getIsNewerBuildId, UNKNOWN_BUILD_ID } from "lib/pwa/buildId";
import { reloadFromNetwork } from "lib/pwa/recoveryNavigation";
import { getSessionStorage } from "lib/pwa/sessionStorage";
import { useLatestValueRef } from "lib/useLatestValueRef";

const RELOADED_BUILD_KEY = "gmx-pwa-update-reloaded-build";
const PENDING_COUNTER_KEY = "gmx-pwa-update-pending-counter";
const EVALUATION_INTERVAL_MS = 30 * 1000;
const INTERACTION_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

type PendingCounter = AppUpdateCounter["data"] & { event: "accepted" | "reloaded" };

function readItem(key: string) {
  try {
    return getSessionStorage()?.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeItem(key: string, value: string) {
  try {
    getSessionStorage()?.setItem(key, value);
  } catch {
    // Storage is best-effort: without it the loop guard costs at most one more reload.
  }
}

/**
 * The reload tears the document down before the metrics queue is flushed, so the counter is handed
 * over to the next launch.
 */
function takePendingCounter() {
  const rawCounter = readItem(PENDING_COUNTER_KEY);
  try {
    getSessionStorage()?.removeItem(PENDING_COUNTER_KEY);
    return rawCounter ? (JSON.parse(rawCounter) as PendingCounter) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Notices that a newer build is being served and moves the app onto it. A launch nobody has touched
 * and an app that is out of sight reload on their own; one with work in progress is offered a reload.
 */
export function useAppUpdateBanner() {
  const isReloadBlocked = useIsAutoReloadBlocked();

  const currentBuildId = useRef(getDocumentBuildId()).current;
  const appStartedAt = useRef(Date.now()).current;
  const [updateBuildId, setUpdateBuildId] = useState<string>();
  const [snoozedUntil, setSnoozedUntil] = useState<number>();
  const [isOffered, setIsOffered] = useState(false);

  const hiddenSince = useRef(document.visibilityState === "hidden" ? Date.now() : undefined);
  const hasInteracted = useRef(false);
  const stateRef = useLatestValueRef({ updateBuildId, snoozedUntil, isReloadBlocked });

  const getStatus = useCallback(
    (overrides?: Partial<AppUpdateStatus>): AppUpdateStatus => {
      const status = {
        ...stateRef.current,
        isOnline: navigator.onLine,
        hiddenSince: hiddenSince.current,
        hasInteracted: hasInteracted.current,
        appStartedAt,
        now: Date.now(),
        ...overrides,
      };

      return { ...status, hasReloaded: readItem(RELOADED_BUILD_KEY) === status.updateBuildId };
    },
    [appStartedAt, stateRef]
  );

  const reload = useCallback(
    (buildId: string, event: PendingCounter["event"]) => {
      const counter: PendingCounter = {
        event,
        fromBuildId: currentBuildId ?? UNKNOWN_BUILD_ID,
        toBuildId: buildId,
      };

      writeItem(RELOADED_BUILD_KEY, buildId);
      writeItem(PENDING_COUNTER_KEY, JSON.stringify(counter));
      reloadFromNetwork(buildId);
    },
    [currentBuildId]
  );

  const evaluate = useCallback(
    (overrides?: Partial<AppUpdateStatus>) => {
      const status = getStatus(overrides);
      const action = getAppUpdateAction(status);

      if (action === "reload" && status.updateBuildId) {
        reload(status.updateBuildId, "reloaded");
        return;
      }

      setIsOffered(action === "offer");
    },
    [getStatus, reload]
  );

  useEffect(function reportPreviousReload() {
    const counter = takePendingCounter();
    if (!counter) {
      return;
    }

    const { event, ...data } = counter;
    metrics.pushCounter<AppUpdateCounter>(`pwa.update.${event}`, data);
  }, []);

  useEffect(function trackActivity() {
    // Only the first interaction matters, so the listeners take themselves off straight away.
    const handleInteraction = () => {
      hasInteracted.current = true;
      removeInteractionListeners();
    };
    const removeInteractionListeners = () =>
      INTERACTION_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleInteraction, { capture: true })
      );
    const handleVisibilityChange = () => {
      hiddenSince.current = document.visibilityState === "hidden" ? Date.now() : undefined;
    };

    INTERACTION_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleInteraction, { capture: true, passive: true, once: true })
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      removeInteractionListeners();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(
    function checkForUpdates() {
      if (!currentBuildId || !import.meta.env.PROD || import.meta.env.VITE_APP_DISABLE_PWA === "true") {
        return;
      }

      let isCancelled = false;

      const check = async () => {
        if (isCancelled || !navigator.onLine) {
          return;
        }

        const networkBuildId = await fetchNetworkBuildId();
        const knownBuildId = stateRef.current.updateBuildId ?? currentBuildId;
        if (isCancelled || !networkBuildId || !getIsNewerBuildId(knownBuildId, networkBuildId)) {
          return;
        }

        // Decide before the state update so a silent reload never flashes the banner first.
        setUpdateBuildId(networkBuildId);
        evaluate({ updateBuildId: networkBuildId });
      };

      const runCheck = () => void check();

      // Without a controller the document came straight from the network, so it is already current.
      if (navigator.serviceWorker?.controller) {
        runCheck();
      }

      const intervalId = window.setInterval(runCheck, UPDATE_CHECK_INTERVAL_MS);
      window.addEventListener("online", runCheck);

      return () => {
        isCancelled = true;
        window.clearInterval(intervalId);
        window.removeEventListener("online", runCheck);
      };
    },
    [currentBuildId, evaluate, stateRef]
  );

  useEffect(
    function reloadWhenOutOfSight() {
      if (!updateBuildId) {
        return;
      }

      const intervalId = window.setInterval(() => evaluate(), EVALUATION_INTERVAL_MS);
      return () => window.clearInterval(intervalId);
    },
    [updateBuildId, evaluate]
  );

  useEffect(
    function reportOffer() {
      if (!isOffered || !updateBuildId) {
        return;
      }

      metrics.pushCounter<AppUpdateCounter>("pwa.update.offered", {
        fromBuildId: currentBuildId ?? UNKNOWN_BUILD_ID,
        toBuildId: updateBuildId,
      });
    },
    [isOffered, updateBuildId, currentBuildId]
  );

  const dismiss = useCallback(() => {
    setSnoozedUntil(Date.now() + SNOOZE_MS);
    setIsOffered(false);

    if (updateBuildId) {
      metrics.pushCounter<AppUpdateCounter>("pwa.update.declined", {
        fromBuildId: currentBuildId ?? UNKNOWN_BUILD_ID,
        toBuildId: updateBuildId,
      });
    }
  }, [currentBuildId, updateBuildId]);

  const applyUpdate = useCallback(() => {
    if (updateBuildId) {
      reload(updateBuildId, "accepted");
    }
  }, [reload, updateBuildId]);

  return { isVisible: isOffered, dismiss, applyUpdate };
}
