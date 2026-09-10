const DEBUG_PARAM = "appUpdateDebug";

/** `?appUpdateDebug=1` makes the running build look older, so the real check finds a real update. */
export const APP_UPDATE_DEBUG = {
  buildId: "1",
  checkDelayMs: 5 * 1000,
  checkIntervalMs: 10 * 1000,
  snoozeMs: 30 * 1000,
};

export function getIsAppUpdateDebug() {
  const { search, hash } = window.location;
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";

  return new URLSearchParams(search).has(DEBUG_PARAM) || new URLSearchParams(hashQuery).has(DEBUG_PARAM);
}
