const SERVICE_WORKER_URL = "/sw.js";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Kill-switch: build with VITE_APP_DISABLE_PWA=true to unregister a previously installed
  // service worker and purge its caches instead of registering. Navigations are network-first,
  // so shipping this flag reliably reaches already-installed clients on their next load.
  if (import.meta.env.VITE_APP_DISABLE_PWA === "true") {
    void unregisterServiceWorker();
    return;
  }

  if (!import.meta.env.PROD) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
      // The app fully works without offline support, so registration errors are ignored
    });
  };

  // Wait for the page to load so registration does not compete with app startup requests
  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

// Removes the service worker and clears its caches. Used by the kill-switch above and
// available for a manual teardown; safe to call when no service worker is registered.
export async function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {
    // Best-effort teardown; the app works with or without the service worker
  }
}
