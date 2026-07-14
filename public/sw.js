const CACHE_PREFIX = "gmx-pwa-";
const SHELL_CACHE = "gmx-pwa-shell-v1";
const ASSET_CACHE = "gmx-pwa-assets-v1";
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE];
const APP_SHELL_URL = "/";
const OFFLINE_SHELL_KEY = "/index.html";
const SHELL_METADATA_KEY = "/__gmx_pwa_shell_metadata__";
const APP_ROOT_MARKER = 'id="root"';
const PWA_SHELL_MARKER = 'name="gmx-pwa-enabled"';
const MAX_ASSET_ENTRIES = 64;
let cacheMutationTail = Promise.resolve();
let isDecommissioning = false;
let decommissionPromise;

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

async function getFromCache(cacheName, request) {
  if (isDecommissioning) {
    return undefined;
  }

  return caches.match(request, { cacheName });
}

function enqueueCacheMutation(task) {
  const result = cacheMutationTail.then(() => {
    if (isDecommissioning) {
      throw new Error("PWA has been disabled");
    }

    return task();
  });
  cacheMutationTail = result.catch(() => undefined);
  return result;
}

function getContentType(response) {
  return response.headers.get("content-type")?.toLowerCase();
}

function isCacheableAssetResponse(response) {
  const contentType = getContentType(response);
  return response.ok && Boolean(contentType) && !contentType.includes("text/html");
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

function areSameAssets(first, second) {
  return first.length === second.length && first.every((url) => second.includes(url));
}

async function readShellMetadata(cache) {
  const shell = await cache.match(OFFLINE_SHELL_KEY);
  if (!shell) {
    return { currentAssets: [], previousAssets: [] };
  }

  let currentAssets;
  try {
    currentAssets = getAppShellAssetUrls(await shell.text());
  } catch {
    return { currentAssets: [], previousAssets: [] };
  }

  try {
    const response = await cache.match(SHELL_METADATA_KEY);
    if (response) {
      const metadata = JSON.parse(await response.text());
      if (
        Array.isArray(metadata.currentAssets) &&
        Array.isArray(metadata.previousAssets) &&
        areSameAssets(metadata.currentAssets, currentAssets)
      ) {
        return metadata;
      }

      if (Array.isArray(metadata.currentAssets) && Array.isArray(metadata.previousAssets)) {
        return {
          currentAssets,
          previousAssets: metadata.currentAssets.filter((url) => !currentAssets.includes(url)),
        };
      }
    }
  } catch {
    // Recover from incomplete metadata writes.
  }

  return { currentAssets, previousAssets: [] };
}

async function pruneShellCache(cache, metadata) {
  const keepUrls = new Set(
    [OFFLINE_SHELL_KEY, SHELL_METADATA_KEY, ...metadata.currentAssets, ...metadata.previousAssets].map(
      (url) => new URL(url, self.location.origin).href
    )
  );
  const keys = await cache.keys();

  await Promise.all(
    keys
      .filter((request) => !keepUrls.has(new URL(request.url, self.location.origin).href))
      .map((request) => cache.delete(request))
  );
}

async function clearPwaCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)));
}

async function decommissionServiceWorker() {
  if (!decommissionPromise) {
    isDecommissioning = true;
    const unregisterPromise = self.registration.unregister();
    const pendingMutations = cacheMutationTail;

    decommissionPromise = (async () => {
      try {
        await unregisterPromise;
      } finally {
        await pendingMutations;
        await clearPwaCaches();
      }
    })();
  }

  return decommissionPromise;
}

async function commitAppShell(response, assetUrls) {
  const cache = await caches.open(SHELL_CACHE);
  const previousMetadata = await readShellMetadata(cache);
  const isSameGeneration = areSameAssets(previousMetadata.currentAssets, assetUrls);

  const assets = await Promise.all(
    assetUrls.map(async (url) => {
      if (await cache.match(url)) {
        return undefined;
      }

      const assetResponse = await fetch(url);

      if (!isCacheableAssetResponse(assetResponse)) {
        throw new Error(`Failed to fetch app shell asset: ${url}`);
      }

      return [url, assetResponse];
    })
  );

  const metadata = isSameGeneration
    ? previousMetadata
    : { currentAssets: assetUrls, previousAssets: previousMetadata.currentAssets };
  const stagedAssets = assets.filter(Boolean);

  try {
    for (const [url, assetResponse] of stagedAssets) {
      await cache.put(url, assetResponse);
    }
    await cache.put(OFFLINE_SHELL_KEY, response);
  } catch (error) {
    await Promise.all(stagedAssets.map(([url]) => cache.delete(url)));
    throw error;
  }

  await cache.put(
    SHELL_METADATA_KEY,
    new Response(JSON.stringify(metadata), { headers: { "content-type": "application/json" } })
  );
  await pruneShellCache(cache, metadata);
}

async function cacheAppShellResponse(response) {
  if (!response.ok || !getContentType(response)?.includes("text/html")) {
    throw new Error("Failed to fetch the app shell");
  }

  const html = await response.clone().text();
  if (!html.includes(APP_ROOT_MARKER)) {
    throw new Error("Invalid app shell");
  }

  if (!html.includes(PWA_SHELL_MARKER)) {
    await decommissionServiceWorker();
    throw new Error("PWA has been disabled");
  }

  const assetUrls = getAppShellAssetUrls(html);
  if (assetUrls.length === 0) {
    throw new Error("App shell has no assets");
  }

  await enqueueCacheMutation(() => commitAppShell(response, assetUrls));
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
    if (response.status >= 500) {
      return (await getFromCache(SHELL_CACHE, OFFLINE_SHELL_KEY)) ?? response;
    }

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
      enqueueCacheMutation(async () => {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(event.request, response.clone());
        await trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
      }).catch(() => {
        // Runtime caching must not affect the network response.
      })
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

  if (request.mode === "navigate" && request.destination === "document") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(handleStaticAsset(event));
  }
});
