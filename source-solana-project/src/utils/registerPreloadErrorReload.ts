const RELOAD_FLAG_KEY = 'vite-preload-error-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;

/**
 * After a new deployment, hashed chunk files referenced by an already-open tab
 * to be sure the hashed chunk be replaced reload the window.
 */
export function registerPreloadErrorReload() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();

    const lastReloadAt = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? 0);
    const now = Date.now();

    if (now - lastReloadAt < RELOAD_COOLDOWN_MS) {
      return;
    }
    sessionStorage.setItem(RELOAD_FLAG_KEY, String(now));
    window.location.reload();
  });
}
