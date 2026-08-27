/**
 * The service worker answers navigations from the cached app shell. This query parameter tells it to
 * go to the network instead, which is the only way a running page can move onto a newer build.
 * Keep it in sync with `RECOVERY_QUERY_PARAM` in `public/sw.js`.
 */
const RECOVERY_QUERY_PARAM = "__gmx_pwa_recovery";

let isReloading = false;

export function getRecoveryUrl(buildId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_QUERY_PARAM, buildId);
  return url.href;
}

/**
 * Leaving the page cancels any module still downloading, which surfaces as a preload error, so the
 * reload is announced to keep the preload recovery from reloading on top of it.
 */
export function reloadFromNetwork(buildId: string) {
  isReloading = true;
  window.location.replace(getRecoveryUrl(buildId));
}

export function getIsReloadingFromNetwork() {
  return isReloading;
}

export function clearRecoveryQueryParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(RECOVERY_QUERY_PARAM)) {
      return;
    }

    url.searchParams.delete(RECOVERY_QUERY_PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // URL cleanup is best-effort.
  }
}
