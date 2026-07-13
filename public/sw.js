const CACHE_PREFIX = "gmx-pwa-";
// Bump when the precached shell changes.
const SHELL_CACHE = "gmx-pwa-shell-v1";
const ASSET_CACHE = "gmx-pwa-assets-v1";
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];
const APP_SHELL_URL = "/";
const OFFLINE_SHELL_KEY = "/index.html";
const MAX_ASSET_ENTRIES = 64;

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([self.skipWaiting(), cacheAppShell()]));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && !KNOWN_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

async function getFromCache(cacheName, request) {
  const cache = await caches.open(cacheName);
  return cache.match(request);
}

function isCacheableAssetResponse(response) {
  const contentType = response.headers?.get?.("content-type")?.toLowerCase();
  return response.ok && !contentType?.includes("text/html");
}

function getAppShellAssetUrls(html) {
  const assetUrls = new Set();

  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], self.location.origin);

    if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
      assetUrls.add(url.href);
    }
  }

  return [...assetUrls];
}

async function cacheAppShellResponse(response) {
  if (!response.ok) {
    throw new Error("Failed to fetch the app shell");
  }

  const html = await response.clone().text();
  const assetUrls = getAppShellAssetUrls(html);
  const assets = await Promise.all(
    assetUrls.map(async (url) => {
      const assetResponse = await fetch(url);

      if (!isCacheableAssetResponse(assetResponse)) {
        throw new Error(`Failed to fetch app shell asset: ${url}`);
      }

      return [url, assetResponse];
    })
  );

  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(assets.map(([url, assetResponse]) => cache.put(url, assetResponse)));
  await cache.put(OFFLINE_SHELL_KEY, response);
}

async function cacheAppShell() {
  const response = await fetch(APP_SHELL_URL);
  await cacheAppShellResponse(response);
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Cache.keys() returns entries in insertion order.
  for (let index = 0; index < keys.length - maxEntries; index++) {
    await cache.delete(keys[index]);
  }
}

async function handleNavigation(event) {
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      event.waitUntil(
        cacheAppShellResponse(response.clone()).catch(() => {
          // Keep the previous complete shell.
        })
      );
    }
    return response;
  } catch (error) {
    const offlineShell = await getFromCache(SHELL_CACHE, OFFLINE_SHELL_KEY);
    if (offlineShell) {
      return offlineShell;
    }
    throw error;
  }
}

async function handleStaticAsset(event) {
  const cached = (await getFromCache(SHELL_CACHE, event.request)) ?? (await getFromCache(ASSET_CACHE, event.request));
  if (cached) {
    return cached;
  }

  const response = await fetch(event.request);
  if (isCacheableAssetResponse(response)) {
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
