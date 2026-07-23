const PWA_CACHE_PREFIX = "gmx-pwa-";
const PWA_CONTROL_CACHE = "gmx-pwa-control-v2";
const PWA_DISABLED_KEY_PREFIX = "/__gmx_pwa_disabled__/";

function shouldDeletePwaCache(cacheName: string, disabledGeneration: number | undefined) {
  if (!cacheName.startsWith(PWA_CACHE_PREFIX) || cacheName === PWA_CONTROL_CACHE) {
    return false;
  }
  if (disabledGeneration === undefined) {
    return true;
  }

  const match = cacheName.match(/^gmx-pwa-(?:shell|assets|chart|stage)-v2-(\d+)/);
  if (!match) {
    return true;
  }
  const cacheGeneration = Number(match[1]);
  return !Number.isSafeInteger(cacheGeneration) || cacheGeneration <= disabledGeneration;
}

function getServiceWorkerGeneration(worker: ServiceWorker | null) {
  if (!worker) {
    return undefined;
  }
  const buildId = new URL(worker.scriptURL).searchParams.get("build");
  const generation = buildId && /^\d+$/.test(buildId) ? Number(buildId) : undefined;
  return Number.isSafeInteger(generation) ? generation : undefined;
}

function isRegistrationSuperseded(registration: ServiceWorkerRegistration, disabledGeneration: number | undefined) {
  if (disabledGeneration === undefined) {
    return false;
  }
  return [registration.installing, registration.waiting, registration.active]
    .map(getServiceWorkerGeneration)
    .some((generation) => generation !== undefined && generation > disabledGeneration);
}

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

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  }

  const register = () => {
    const buildId = document.querySelector<HTMLMetaElement>('meta[name="gmx-pwa-build-id"]')?.content;
    if (!buildId) {
      return;
    }

    const serviceWorkerUrl = `/sw.js?build=${encodeURIComponent(buildId)}`;
    navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {
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

  const buildId = document.querySelector<HTMLMetaElement>('meta[name="gmx-pwa-build-id"]')?.content;
  const disabledGeneration = buildId && /^\d+$/.test(buildId) ? Number(buildId) : undefined;

  try {
    if (typeof caches !== "undefined") {
      if (disabledGeneration !== undefined && Number.isSafeInteger(disabledGeneration)) {
        const controlCache = await caches.open(PWA_CONTROL_CACHE);
        await controlCache.put(
          `${PWA_DISABLED_KEY_PREFIX}${buildId}`,
          new Response("disabled", { headers: { "content-type": "text/plain" } })
        );
      }
    }
  } catch {
    // Cleanup is best-effort.
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration && !isRegistrationSuperseded(registration, disabledGeneration)) {
      await registration.unregister();
    }
  } catch {
    // Cleanup is best-effort.
  }

  try {
    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => shouldDeletePwaCache(name, disabledGeneration)).map((name) => caches.delete(name))
      );
    }
  } catch {
    // Cleanup is best-effort.
  }
}
