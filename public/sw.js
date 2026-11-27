const NAVIGATION_TIMEOUT_MS = 10_000;
const LEGACY_ASSET_CACHE_PATTERN = /^gmx-pwa-(?:shell|assets)-v2-\d+$/;
const CONTROL_CACHE = "gmx-pwa-control-v2";

const CONNECTION_ERROR_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090A14" />
    <title>GMX | Unable to connect</title>
    <style>
      html { background: #090a14; color: #fff; font: 16px/1.5 system-ui, sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; }
      main { max-width: 28rem; padding: 2rem; text-align: center; }
      h1 { font-size: 1.5rem; }
      p { color: #b4bbd5; }
      button { margin-top: 1rem; padding: .75rem 1.5rem; border: 0; border-radius: .25rem;
        background: #2d42fc; color: #fff; font: inherit; cursor: pointer; }
      button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Unable to connect</h1>
      <p>GMX needs an internet connection. Check your connection and try again.</p>
      <button type="button" onclick="window.location.reload()">Retry</button>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    isRegistrationDisabled().then((disabled) => {
      if (disabled) {
        throw new Error("PWA has been disabled for this build");
      }
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function isRegistrationDisabled() {
  // Honor disable markers written by existing releases without creating any caches.
  const buildId = new URL(self.location.href).searchParams.get("build");
  const generation = buildId && /^\d+$/.test(buildId) ? Number(buildId) : undefined;
  if (!Number.isSafeInteger(generation)) {
    return false;
  }

  try {
    if (!(await caches.keys()).includes(CONTROL_CACHE)) {
      return false;
    }
    const cache = await caches.open(CONTROL_CACHE);
    return (await cache.keys()).some((request) => {
      const match = new URL(request.url).pathname.match(/^\/__gmx_pwa_disabled__\/(\d+)$/);
      const disabledGeneration = match ? Number(match[1]) : undefined;
      return Number.isSafeInteger(disabledGeneration) && disabledGeneration >= generation;
    });
  } catch {
    // Unavailable storage must not prevent registration.
    return false;
  }
}

async function handleNavigation(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);

  try {
    const response = await fetch(request, { cache: "no-store", signal: controller.signal });
    if (response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      // Keep the deadline until HTML finishes downloading, preserving the original redirect response.
      await response.clone().arrayBuffer();
    }
    return response;
  } catch {
    return new Response(CONNECTION_ERROR_HTML, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isValidAssetResponse(response, url) {
  if (!response || response.status !== 200) {
    return false;
  }
  const contentType = response.headers.get("content-type")?.toLowerCase();
  return url.pathname.endsWith(".js") ? contentType?.includes("javascript") : contentType?.includes("text/css");
}

async function getLegacyAsset(request, url) {
  // Older open tabs may still need removed chunks. These caches are read-only during migration.
  try {
    for (const cacheName of await caches.keys()) {
      if (!LEGACY_ASSET_CACHE_PATTERN.test(cacheName)) {
        continue;
      }
      const response = await caches.match(request, { cacheName });
      if (isValidAssetResponse(response, url)) {
        return response;
      }
    }
  } catch {
    // Cache Storage may be unavailable or evicted.
  }
  return undefined;
}

async function handleAsset(request, url) {
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    const cached = await getLegacyAsset(request, url);
    if (cached) {
      return cached;
    }
    throw error;
  }

  if (isValidAssetResponse(response, url)) {
    return response;
  }
  return (await getLegacyAsset(request, url)) ?? response;
}

// All mirror src/config/notifications.ts.
const NOTIFICATION_CLICK_MESSAGE_TYPE = "gmx-notification-click";
const NOTIFICATION_ROUTE_SEARCH_PARAM = "notification";
const NOTIFICATION_TYPE_SEARCH_PARAM = "notificationType";
const NOTIFICATION_FALLBACK_ROUTE = "/trade";

function readPushPayload(data) {
  try {
    const payload = data?.json();
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function showPushNotification(data) {
  const payload = readPushPayload(data);
  const tag = typeof payload.tag === "string" && payload.tag ? payload.tag : undefined;

  // Every push must show something: Safari withdraws the permission after silent pushes. Whether a push is still
  // relevant is the server's decision, so nothing is filtered here.
  return self.registration.showNotification(
    typeof payload.title === "string" && payload.title ? payload.title : "GMX",
    {
      body: typeof payload.body === "string" ? payload.body : "",
      icon: "/android-chrome-192x192.png",
      tag,
      // A liquidation replaces the one shown for its position and must still alert.
      renotify: Boolean(tag),
      data: payload.data && typeof payload.data === "object" ? payload.data : {},
    }
  );
}

self.addEventListener("push", (event) => {
  event.waitUntil(showPushNotification(event.data));
});

// The server links to its production app with a hash route. Only a trade page of this origin may open, so a preview
// keeps its taps.
function getNotificationRoute(url) {
  try {
    const link = new URL(url);
    const route = link.hash.startsWith("#/") ? link.hash.slice(1) : link.pathname + link.search;
    const target = new URL(route, self.location.origin);
    const isTradePage = target.pathname === "/trade" || target.pathname.startsWith("/trade/");
    if (target.origin === self.location.origin && isTradePage) {
      return target.pathname + target.search;
    }
  } catch {
    // Falls back below.
  }
  return NOTIFICATION_FALLBACK_ROUTE;
}

async function openNotificationRoute(route, notificationType) {
  // Same-origin iframes, like the TradingView chart, are window clients too and can be the focused one.
  const windows = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).filter(
    (client) => client.frameType !== "nested"
  );
  const appWindow =
    windows.find((client) => client.focused) ??
    windows.find((client) => client.visibilityState === "visible") ??
    windows[0];

  if (appWindow) {
    // The app switches chains and navigates itself, so an open window keeps its state.
    await appWindow.focus().catch(() => undefined);
    appWindow.postMessage({ type: NOTIFICATION_CLICK_MESSAGE_TYPE, route, notificationType });
    return;
  }

  const searchParams = new URLSearchParams({
    [NOTIFICATION_ROUTE_SEARCH_PARAM]: route,
    [NOTIFICATION_TYPE_SEARCH_PARAM]: notificationType,
  });
  await self.clients.openWindow(`${NOTIFICATION_FALLBACK_ROUTE}?${searchParams}`);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, type } = event.notification.data ?? {};
  event.waitUntil(openNotificationRoute(getNotificationRoute(url), typeof type === "string" ? type : ""));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    // TradingView iframe navigations must use the browser's normal loading behavior.
    if (request.destination === "document") {
      event.respondWith(handleNavigation(request));
    }
    return;
  }

  if (url.pathname.startsWith("/assets/") && /\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(handleAsset(request, url));
  }
});
