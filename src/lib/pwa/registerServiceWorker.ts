const SERVICE_WORKER_URL = "/sw.js";
const PWA_CACHE_PREFIX = "gmx-pwa-";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Network-first navigation lets installed clients receive the kill-switch build.
  if (import.meta.env.VITE_APP_DISABLE_PWA === "true") {
    void unregisterServiceWorker();
    return;
  }

  if (!import.meta.env.PROD) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
      // Registration failure must not block the app.
    });
  };

  // Avoid competing with startup requests.
  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

export async function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    await registration?.unregister();
  } catch {
    // Cleanup is best-effort.
  }

  try {
    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => name.startsWith(PWA_CACHE_PREFIX)).map((name) => caches.delete(name))
      );
    }
  } catch {
    // Cleanup is best-effort.
  }
}
