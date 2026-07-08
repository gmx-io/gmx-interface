// GMX PWA service worker.
// Navigations are network-first so new deployments are picked up immediately.
// Only immutable hashed build files under /assets/ are served cache-first.
const SHELL_CACHE = "gmx-shell-v1";
const ASSET_CACHE = "gmx-assets-v1";
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];
const OFFLINE_SHELL_KEY = "/index.html";
// Hashed assets are immutable, so old deployments' files are never requested again.
// Cap the asset cache so those stale entries can't grow without bound.
const MAX_ASSET_ENTRIES = 64;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((name) => !KNOWN_CACHES.includes(name)).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // keys() preserves insertion order, so the oldest entries come first.
  for (let index = 0; index < keys.length - maxEntries; index++) {
    await cache.delete(keys[index]);
  }
}

async function handleNavigation(event) {
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      event.waitUntil(putInCache(SHELL_CACHE, OFFLINE_SHELL_KEY, response.clone()));
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
    event.waitUntil(
      putInCache(ASSET_CACHE, event.request, response.clone()).then(() => trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES))
    );
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
