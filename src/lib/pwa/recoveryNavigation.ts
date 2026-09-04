/** Tells the service worker to answer the navigation from the network. Mirrors `public/sw.js`. */
const RECOVERY_QUERY_PARAM = "__gmx_pwa_recovery";

let isReloading = false;

export function getRecoveryUrl(buildId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_QUERY_PARAM, buildId);
  return url.href;
}

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
