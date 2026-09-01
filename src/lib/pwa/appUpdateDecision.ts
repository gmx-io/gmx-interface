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
