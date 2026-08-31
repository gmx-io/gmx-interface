export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
export const FRESH_SESSION_MS = 30 * 1000;
export const HIDDEN_IDLE_MS = 5 * 60 * 1000;
export const SNOOZE_MS = 60 * 60 * 1000;

export type AppUpdateStatus = {
  updateBuildId: string | undefined;
  isReloadBlocked: boolean;
  isOnline: boolean;
  hiddenSince: number | undefined;
  snoozedUntil: number | undefined;
  /** A reload for this build already happened and did not land on it, so it must not be retried. */
  hasReloaded: boolean;
  hasInteracted: boolean;
  appStartedAt: number;
  now: number;
};

export type AppUpdateAction = "reload" | "offer" | "none";

function getCanReloadUnseen(status: AppUpdateStatus) {
  if (status.isReloadBlocked || !status.isOnline || status.hasReloaded) {
    return false;
  }

  if (!status.hasInteracted && status.now - status.appStartedAt < FRESH_SESSION_MS) {
    return true;
  }

  // A visible app is never reloaded from under the user: interaction inside the chart iframe does
  // not reach us, so an app that looks idle can still be in use.
  return status.hiddenSince !== undefined && status.now - status.hiddenSince >= HIDDEN_IDLE_MS;
}

export function getAppUpdateAction(status: AppUpdateStatus): AppUpdateAction {
  if (!status.updateBuildId) {
    return "none";
  }

  if (status.snoozedUntil !== undefined && status.now < status.snoozedUntil) {
    return "none";
  }

  return getCanReloadUnseen(status) ? "reload" : "offer";
}
