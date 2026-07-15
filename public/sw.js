const CACHE_PREFIX = "gmx-pwa-";
const SHELL_CACHE_PREFIX = "gmx-pwa-shell-v2-";
const STAGING_CACHE_PREFIX = "gmx-pwa-stage-v2-";
const ASSET_CACHE_PREFIX = "gmx-pwa-assets-v2-";
const CHART_CACHE_PREFIX = "gmx-pwa-chart-v2-";
const CONTROL_CACHE = "gmx-pwa-control-v2";
const DISABLED_KEY_PREFIX = "/__gmx_pwa_disabled__/";
const APP_SHELL_URL = "/";
const OFFLINE_SHELL_KEY = "/index.html";
const APP_ROOT_MARKER = 'id="root"';
const PWA_SHELL_MARKER = 'name="gmx-pwa-enabled" content="true"';
const PWA_BUILD_ID_PATTERN = /<meta\s+name=["']gmx-pwa-build-id["']\s+content=["']([^"']+)["'][^>]*>/i;
const BUILD_ID_PATTERN = /^\d+$/;
const CHART_LIBRARY_PATH = "/charting_library/";
const CHART_SAME_ORIGIN_PATH = "/charting_library/sameorigin.html";
const CHART_STYLES_PATH = "/tradingview-chart.css";
const CHART_BOOTSTRAP_PATHS = [
  "/charting_library/charting_library.standalone.js",
  CHART_SAME_ORIGIN_PATH,
  "/charting_library/bundles/runtime.4d986d07cb97d8edacba.js",
  "/charting_library/bundles/en.4026.6f886b4ecb915f046a50.js",
  "/charting_library/bundles/9662.03109f673cda5962c847.css",
  "/charting_library/bundles/7346.a2efeed47130dd4e832c.js",
  "/charting_library/bundles/library.f5eaeb6901219f861981.js",
  CHART_STYLES_PATH,
];
const MAX_SHELL_GENERATIONS = 2;
const MAX_ASSET_ENTRIES = 64;
const MAX_CHART_ENTRIES = 96;
const workerBuildId = new URL(self.location.href).searchParams.get("build");
const workerGeneration = workerBuildId && BUILD_ID_PATTERN.test(workerBuildId) ? Number(workerBuildId) : undefined;
const hasValidWorkerBuildId = Number.isSafeInteger(workerGeneration) && workerGeneration > 0;
const SHELL_CACHE = `${SHELL_CACHE_PREFIX}${workerBuildId}`;
const ASSET_CACHE = `${ASSET_CACHE_PREFIX}${workerBuildId}`;
const CHART_CACHE = `${CHART_CACHE_PREFIX}${workerBuildId}`;
let cacheMutationTail = Promise.resolve();
let isDecommissioning = false;
let decommissionPromise;

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([self.skipWaiting(), cacheAppShell()]));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    getBlockingDisabledGeneration().then((disabledGeneration) =>
      disabledGeneration !== undefined
        ? decommissionServiceWorker(disabledGeneration)
        : cleanupCachesOnActivate().then(() => self.clients.claim())
    )
  );
});

function enqueueCacheMutation(task) {
  const result = cacheMutationTail.then(async () => {
    if (isDecommissioning || (await isPwaDisabled())) {
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

function isCacheableAssetResponse(response, url) {
  const contentType = getContentType(response);
  if (!response.ok || !contentType) {
    return false;
  }

  const extension = url.pathname.split(".").pop()?.toLowerCase();
  if (extension === "js") {
    return contentType.includes("javascript");
  }
  if (extension === "css") {
    return contentType.includes("text/css");
  }
  if (["woff", "woff2", "ttf"].includes(extension)) {
    return contentType.startsWith("font/") || contentType.includes("font-");
  }
  if (["avif", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) {
    return contentType.startsWith("image/");
  }
  return false;
}

function isCacheableChartResponse(response, url) {
  const contentType = getContentType(response);
  if (!response.ok || !contentType) {
    return false;
  }

  if (url.pathname === CHART_SAME_ORIGIN_PATH) {
    return contentType.includes("text/html");
  }

  const extension = url.pathname.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "js":
      return contentType.includes("javascript");
    case "css":
      return contentType.includes("text/css");
    case "json":
      return contentType.includes("application/json");
    case "woff":
    case "woff2":
    case "ttf":
      return contentType.startsWith("font/") || contentType.includes("font-");
    case "png":
    case "svg":
    case "cur":
      return contentType.startsWith("image/");
    case "wasm":
      return contentType.includes("application/wasm");
    default:
      return false;
  }
}

function isCacheableShellAssetResponse(response, url) {
  return url.pathname.startsWith(CHART_LIBRARY_PATH) || url.pathname === CHART_STYLES_PATH
    ? isCacheableChartResponse(response, url)
    : isCacheableAssetResponse(response, url);
}

function getAppShellAssetUrls(html) {
  const assetUrls = new Set(CHART_BOOTSTRAP_PATHS.map((path) => new URL(path, self.location.origin).href));

  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
      assetUrls.add(url.href);
    }
  }

  return [...assetUrls];
}

function getGenerationFromCacheName(cacheName, prefix) {
  if (!cacheName.startsWith(prefix)) {
    return undefined;
  }

  const buildId = cacheName.slice(prefix.length);
  const generation = BUILD_ID_PATTERN.test(buildId) ? Number(buildId) : undefined;
  return Number.isSafeInteger(generation) ? generation : undefined;
}

function getStagingGeneration(cacheName) {
  const match = cacheName.match(/^gmx-pwa-stage-v2-(\d+)-/);
  const generation = match ? Number(match[1]) : undefined;
  return Number.isSafeInteger(generation) ? generation : undefined;
}

async function getReadyShellCacheNames() {
  const cacheNames = await caches.keys();
  const ready = [];
  for (const cacheName of cacheNames) {
    const generation = getGenerationFromCacheName(cacheName, SHELL_CACHE_PREFIX);
    if (generation !== undefined) {
      if (await caches.match(OFFLINE_SHELL_KEY, { cacheName })) {
        ready.push({ cacheName, generation });
      }
    }
  }
  return ready.sort((first, second) => second.generation - first.generation).map(({ cacheName }) => cacheName);
}

async function getFromShellCaches(request) {
  if (isDecommissioning) {
    return undefined;
  }

  const currentResponse = await caches.match(request, { cacheName: SHELL_CACHE });
  if (currentResponse) {
    return currentResponse;
  }

  for (const cacheName of await getReadyShellCacheNames()) {
    if (cacheName === SHELL_CACHE) {
      continue;
    }
    const response = await caches.match(request, { cacheName });
    if (response) {
      return response;
    }
  }
  return undefined;
}

async function cleanupCachesOnActivate() {
  const cacheNames = await caches.keys();
  const readyShellNames = await getReadyShellCacheNames();
  const retainedShellNames = new Set(
    [SHELL_CACHE, ...readyShellNames]
      .filter((name, index, names) => names.indexOf(name) === index)
      .slice(0, MAX_SHELL_GENERATIONS)
  );
  const retainedBuildIds = new Set(
    [...retainedShellNames]
      .map((name) => getGenerationFromCacheName(name, SHELL_CACHE_PREFIX))
      .filter((generation) => generation !== undefined)
  );

  await Promise.all(
    cacheNames
      .filter((name) => {
        if (!name.startsWith(CACHE_PREFIX)) {
          return false;
        }
        if (name === CONTROL_CACHE) {
          return false;
        }
        if (name.startsWith(STAGING_CACHE_PREFIX)) {
          const stagingGeneration = getStagingGeneration(name);
          return stagingGeneration === undefined || stagingGeneration <= workerGeneration;
        }
        const shellGeneration = getGenerationFromCacheName(name, SHELL_CACHE_PREFIX);
        if (shellGeneration !== undefined) {
          return shellGeneration <= workerGeneration && !retainedShellNames.has(name);
        }
        const assetGeneration = getGenerationFromCacheName(name, ASSET_CACHE_PREFIX);
        if (assetGeneration !== undefined) {
          return assetGeneration <= workerGeneration && !retainedBuildIds.has(assetGeneration);
        }
        const chartGeneration = getGenerationFromCacheName(name, CHART_CACHE_PREFIX);
        if (chartGeneration !== undefined) {
          return chartGeneration <= workerGeneration && !retainedBuildIds.has(chartGeneration);
        }
        return true;
      })
      .map((name) => caches.delete(name))
  );
}

function shouldDeleteForGeneration(cacheName, generation) {
  const cacheGeneration =
    getGenerationFromCacheName(cacheName, SHELL_CACHE_PREFIX) ??
    getGenerationFromCacheName(cacheName, ASSET_CACHE_PREFIX) ??
    getGenerationFromCacheName(cacheName, CHART_CACHE_PREFIX) ??
    getStagingGeneration(cacheName);
  return cacheGeneration === undefined || cacheGeneration <= generation;
}

async function clearPwaCaches(generation) {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(
        (name) => name.startsWith(CACHE_PREFIX) && name !== CONTROL_CACHE && shouldDeleteForGeneration(name, generation)
      )
      .map((name) => caches.delete(name))
  );
}

async function getBlockingDisabledGeneration() {
  if (!hasValidWorkerBuildId) {
    return Number.MAX_SAFE_INTEGER;
  }

  const cache = await caches.open(CONTROL_CACHE);
  const keys = await cache.keys();
  const generations = keys
    .map((request) => new URL(request.url, self.location.origin).pathname)
    .filter((pathname) => pathname.startsWith(DISABLED_KEY_PREFIX))
    .map((pathname) => Number(pathname.slice(DISABLED_KEY_PREFIX.length)))
    .filter((generation) => Number.isSafeInteger(generation) && generation >= workerGeneration);
  return generations.length > 0 ? Math.max(...generations) : undefined;
}

async function isPwaDisabled() {
  return (await getBlockingDisabledGeneration()) !== undefined;
}

async function setPwaDisabled(generation) {
  const disabledGeneration =
    Number.isSafeInteger(generation) && generation > 0
      ? generation
      : hasValidWorkerBuildId
        ? workerGeneration
        : Number.MAX_SAFE_INTEGER;
  const cache = await caches.open(CONTROL_CACHE);
  await cache.put(
    `${DISABLED_KEY_PREFIX}${disabledGeneration}`,
    new Response("disabled", { headers: { "content-type": "text/plain" } })
  );
}

function getServiceWorkerGeneration(worker) {
  if (!worker?.scriptURL) {
    return undefined;
  }
  const buildId = new URL(worker.scriptURL).searchParams.get("build");
  const generation = buildId && BUILD_ID_PATTERN.test(buildId) ? Number(buildId) : undefined;
  return Number.isSafeInteger(generation) ? generation : undefined;
}

async function unregisterIfNotSuperseded(disabledGeneration) {
  const registrationGenerations = [self.registration.installing, self.registration.waiting, self.registration.active]
    .map(getServiceWorkerGeneration)
    .filter((generation) => generation !== undefined);
  if (registrationGenerations.some((generation) => generation > disabledGeneration)) {
    return false;
  }
  return self.registration.unregister();
}

async function decommissionServiceWorker(disabledGeneration = workerGeneration) {
  if (!decommissionPromise) {
    isDecommissioning = true;
    try {
      await setPwaDisabled(disabledGeneration);
    } catch {
      // Continue with best-effort cleanup.
    }
    const unregisterPromise = unregisterIfNotSuperseded(disabledGeneration);
    const pendingMutations = cacheMutationTail;

    decommissionPromise = (async () => {
      try {
        await unregisterPromise;
      } catch {
        // Continue with best-effort cleanup.
      } finally {
        await pendingMutations;
        await clearPwaCaches(disabledGeneration);
      }
    })();
  }
  return decommissionPromise;
}

async function validateAppShell(response, requireMatchingBuild) {
  if (!response.ok || !getContentType(response)?.includes("text/html")) {
    throw new Error("Failed to fetch the app shell");
  }

  const html = await response.clone().text();
  const shellBuildId = html.match(PWA_BUILD_ID_PATTERN)?.[1];
  const shellGeneration = shellBuildId && BUILD_ID_PATTERN.test(shellBuildId) ? Number(shellBuildId) : undefined;
  if (!html.includes(APP_ROOT_MARKER)) {
    throw new Error("Invalid app shell");
  }
  if (!html.includes(PWA_SHELL_MARKER)) {
    await decommissionServiceWorker(shellGeneration ?? workerGeneration);
    throw new Error("PWA has been disabled");
  }

  if (requireMatchingBuild) {
    if (!hasValidWorkerBuildId || shellBuildId !== workerBuildId) {
      throw new Error("App shell build does not match the service worker");
    }
  }
  return html;
}

async function cacheAppShell() {
  const response = await fetch(APP_SHELL_URL);
  const html = await validateAppShell(response, true);
  const newerShell = (await getReadyShellCacheNames()).find(
    (name) => getGenerationFromCacheName(name, SHELL_CACHE_PREFIX) > workerGeneration
  );
  if (newerShell) {
    throw new Error("A newer app shell is already installed");
  }
  if (await isPwaDisabled()) {
    throw new Error("PWA has been disabled");
  }
  const assetUrls = getAppShellAssetUrls(html);
  const stagingCacheName = `${STAGING_CACHE_PREFIX}${workerBuildId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const stagingCache = await caches.open(stagingCacheName);

  try {
    for (const assetUrl of assetUrls) {
      const assetResponse = await fetch(assetUrl);
      const url = new URL(assetUrl);
      if (!isCacheableShellAssetResponse(assetResponse, url)) {
        throw new Error(`Failed to fetch app shell asset: ${assetUrl}`);
      }
      await stagingCache.put(assetUrl, assetResponse);
    }
    await stagingCache.put(OFFLINE_SHELL_KEY, response);

    if (
      (await isPwaDisabled()) ||
      (await getReadyShellCacheNames()).some(
        (name) => getGenerationFromCacheName(name, SHELL_CACHE_PREFIX) > workerGeneration
      )
    ) {
      throw new Error("App shell installation became stale");
    }

    await caches.delete(SHELL_CACHE);
    const shellCache = await caches.open(SHELL_CACHE);
    try {
      for (const assetUrl of assetUrls) {
        const assetResponse = await stagingCache.match(assetUrl);
        if (!assetResponse) {
          throw new Error(`Missing staged app shell asset: ${assetUrl}`);
        }
        await shellCache.put(assetUrl, assetResponse);
      }
      const shellResponse = await stagingCache.match(OFFLINE_SHELL_KEY);
      if (!shellResponse) {
        throw new Error("Missing staged app shell");
      }
      await shellCache.put(OFFLINE_SHELL_KEY, shellResponse);
      if (await isPwaDisabled()) {
        throw new Error("PWA has been disabled");
      }
    } catch (error) {
      await caches.delete(SHELL_CACHE);
      throw error;
    }
  } finally {
    await caches.delete(stagingCacheName);
  }
}

async function inspectNavigationResponse(response) {
  if (response.ok && getContentType(response)?.includes("text/html")) {
    await validateAppShell(response, false);
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  for (let index = 0; index < keys.length - maxEntries; index++) {
    await cache.delete(keys[index]);
  }
}

async function handleNavigation(event) {
  try {
    const response = await fetch(event.request);
    if (response.status >= 500) {
      return (await getFromShellCaches(OFFLINE_SHELL_KEY)) ?? response;
    }
    if (response.ok && getContentType(response)?.includes("text/html")) {
      const responseForInspection = response.clone();
      event.waitUntil(
        inspectNavigationResponse(responseForInspection).catch(() => {
          // Keep returning the network response while cleanup completes.
        })
      );
    }
    return response;
  } catch (error) {
    const offlineShell = await getFromShellCaches(OFFLINE_SHELL_KEY);
    if (offlineShell) {
      return offlineShell;
    }
    throw error;
  }
}

async function handleCachedResource(event, cacheName, maxEntries, isCacheable) {
  const cached = (await getFromShellCaches(event.request)) ?? (await caches.match(event.request, { cacheName }));
  if (cached) {
    return cached;
  }

  const response = await fetch(event.request);
  const url = new URL(event.request.url);
  if (isCacheable(response, url)) {
    const responseForCache = response.clone();
    event.waitUntil(
      enqueueCacheMutation(async () => {
        const cache = await caches.open(cacheName);
        await cache.put(event.request, responseForCache);
        await trimCache(cache, maxEntries);
        if (await isPwaDisabled()) {
          await caches.delete(cacheName);
          throw new Error("PWA has been disabled");
        }
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
    event.respondWith(handleCachedResource(event, ASSET_CACHE, MAX_ASSET_ENTRIES, isCacheableAssetResponse));
    return;
  }
  if (url.pathname.startsWith(CHART_LIBRARY_PATH) || url.pathname === CHART_STYLES_PATH) {
    event.respondWith(handleCachedResource(event, CHART_CACHE, MAX_CHART_ENTRIES, isCacheableChartResponse));
  }
});
