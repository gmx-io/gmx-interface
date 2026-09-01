import { useCallback, useEffect, useRef, useState } from "react";

import { metrics } from "lib/metrics";
import { AppUpdateCounter } from "lib/metrics/types";
import { APP_UPDATE_DEBUG, getIsAppUpdateDebug } from "lib/pwa/appUpdateDebug";
import { AppUpdateStatus, getAppUpdateAction, SNOOZE_MS, UPDATE_CHECK_INTERVAL_MS } from "lib/pwa/appUpdateDecision";
import { useIsAutoReloadBlocked } from "lib/pwa/blockAutoReload";
import { fetchNetworkBuildId, getDocumentBuildId, getIsNewerBuildId, UNKNOWN_BUILD_ID } from "lib/pwa/buildId";
import { reloadFromNetwork } from "lib/pwa/recoveryNavigation";
import { getCanUseSessionStorage, getSessionStorage } from "lib/pwa/sessionStorage";
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
    const storage = getSessionStorage();
    if (!storage) {
      return false;
    }

    storage.setItem(key, value);
    return storage.getItem(key) === value;
  } catch {
    return false;
  }
}

function takePendingCounter() {
  const rawCounter = readItem(PENDING_COUNTER_KEY);
  try {
    getSessionStorage()?.removeItem(PENDING_COUNTER_KEY);
    return rawCounter ? (JSON.parse(rawCounter) as PendingCounter) : undefined;
  } catch {
    return undefined;
  }
}

export function useAppUpdateBanner() {
  const isReloadBlocked = useIsAutoReloadBlocked();

  const isDebug = useRef(getIsAppUpdateDebug()).current;
  const currentBuildId = useRef(isDebug ? APP_UPDATE_DEBUG.buildId : getDocumentBuildId()).current;
  const appStartedAt = useRef(Date.now()).current;
  const canPersistReloadRef = useRef<boolean>();
  if (canPersistReloadRef.current === undefined) {
    canPersistReloadRef.current = getCanUseSessionStorage();
  }
  const [updateBuildId, setUpdateBuildId] = useState<string>();
  const [snoozedUntil, setSnoozedUntil] = useState<number>();
  const [isOffered, setIsOffered] = useState(false);

  const hiddenSince = useRef(document.visibilityState === "hidden" ? Date.now() : undefined);
  const hasInteracted = useRef(false);
  const stateRef = useLatestValueRef({ updateBuildId, snoozedUntil, isReloadBlocked });

  const reload = useCallback(
    (buildId: string, event: PendingCounter["event"]) => {
      const counter: PendingCounter = {
        event,
        fromBuildId: currentBuildId ?? UNKNOWN_BUILD_ID,
        toBuildId: buildId,
      };

      const didPersistReload = writeItem(RELOADED_BUILD_KEY, buildId);
      if (!didPersistReload && event === "reloaded") {
        canPersistReloadRef.current = false;
        return false;
      }

      writeItem(PENDING_COUNTER_KEY, JSON.stringify(counter));
      reloadFromNetwork(buildId);
      return true;
    },
    [currentBuildId]
  );

  const evaluate = useCallback(
    (overrides?: Partial<AppUpdateStatus>) => {
      const status = {
        ...stateRef.current,
        isOnline: navigator.onLine,
        hiddenSince: hiddenSince.current,
        hasInteracted: hasInteracted.current,
        appStartedAt,
        canPersistReload: canPersistReloadRef.current ?? false,
        now: Date.now(),
        ...overrides,
      };
      const action = getAppUpdateAction({
        ...status,
        hasReloaded: readItem(RELOADED_BUILD_KEY) === status.updateBuildId,
      });

      if (action === "reload" && status.updateBuildId) {
        if (!reload(status.updateBuildId, "reloaded")) {
          setIsOffered(true);
        }
        return;
      }

      setIsOffered(action === "offer");
    },
    [appStartedAt, reload, stateRef]
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
      if (!currentBuildId || (!import.meta.env.PROD && !isDebug) || import.meta.env.VITE_APP_DISABLE_PWA === "true") {
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
      const shouldCheckNow = isDebug || Boolean(navigator.serviceWorker?.controller);
      const firstCheckId = shouldCheckNow
        ? window.setTimeout(runCheck, isDebug ? APP_UPDATE_DEBUG.checkDelayMs : 0)
        : undefined;
      const intervalId = window.setInterval(
        runCheck,
        isDebug ? APP_UPDATE_DEBUG.checkIntervalMs : UPDATE_CHECK_INTERVAL_MS
      );
      window.addEventListener("online", runCheck);

      return () => {
        isCancelled = true;
        window.clearTimeout(firstCheckId);
        window.clearInterval(intervalId);
        window.removeEventListener("online", runCheck);
      };
    },
    [currentBuildId, evaluate, isDebug, stateRef]
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
    setSnoozedUntil(Date.now() + (isDebug ? APP_UPDATE_DEBUG.snoozeMs : SNOOZE_MS));
    setIsOffered(false);

    if (updateBuildId) {
      metrics.pushCounter<AppUpdateCounter>("pwa.update.declined", {
        fromBuildId: currentBuildId ?? UNKNOWN_BUILD_ID,
        toBuildId: updateBuildId,
      });
    }
  }, [currentBuildId, isDebug, updateBuildId]);

  const applyUpdate = useCallback(() => {
    if (updateBuildId) {
      reload(updateBuildId, "accepted");
    }
  }, [reload, updateBuildId]);

  return { isVisible: isOffered, dismiss, applyUpdate };
}
