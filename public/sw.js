// GMX PWA service worker.
// Navigations are network-first so new deployments are picked up immediately.
// Only immutable hashed build files under /assets/ are served cache-first.
const CACHE_NAME = "gmx-pwa-v1";
const OFFLINE_SHELL_KEY = "/index.html";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

async function handleNavigation(event) {
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      event.waitUntil(putInCache(OFFLINE_SHELL_KEY, response.clone()));
    }
    return response;
  } catch (error) {
    const offlineShell = await caches.match(OFFLINE_SHELL_KEY);
    if (offlineShell) {
      return offlineShell;
    }
    throw error;
  }
}

async function handleStaticAsset(event) {
  const cached = await caches.match(event.request);
  if (cached) {
    return cached;
  }

  const response = await fetch(event.request);
  if (response.ok) {
    event.waitUntil(putInCache(event.request, response.clone()));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(handleStaticAsset(event));
  }
});
