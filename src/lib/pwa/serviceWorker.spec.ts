import { readFileSync } from "node:fs";
import { cwd } from "node:process";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const SERVICE_WORKER_SOURCE = readFileSync(`${cwd()}/public/sw.js`, "utf8");
const ORIGIN = "https://app.example";
const SHELL_CACHE_NAME = "gmx-pwa-shell-v2-2";
const APP_SHELL_ASSET_URL = `${ORIGIN}/assets/index-abc123.js`;
const APP_SHELL_HTML = `
  <meta name="gmx-pwa-build-id" content="2" />
  <meta name="gmx-pwa-enabled" content="true" />
  <script type="module" src="/assets/index-abc123.js"></script>
  <div id="root"></div>
`;

type FetchEvent = {
  request: {
    destination: string;
    method: string;
    mode: string;
    url: string;
  };
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

type InstallEvent = {
  waitUntil: (promise: Promise<unknown>) => void;
};

type Listener = (event: FetchEvent | InstallEvent) => void;

type FetchMock = (url: string) => Promise<Response>;

type CacheEntries = Record<string, Record<string, Response>>;

function createCacheStorage(initialEntries: CacheEntries = {}) {
  const stores = new Map<string, Map<string, Response>>(
    Object.entries(initialEntries).map(([cacheName, entries]) => [cacheName, new Map(Object.entries(entries))])
  );

  // The Cache API keeps the redirect history of a stored response, so clones must keep the flag
  // for the specs to catch a poisoned shell.
  function cloneStored(response: Response) {
    const clone = response.clone();
    Object.defineProperty(clone, "redirected", { value: response.redirected });
    return clone;
  }

  function matchIn(store: Map<string, Response> | undefined, key: string) {
    const response = store?.get(key);
    return response ? cloneStored(response) : undefined;
  }

  return {
    delete: async (cacheName: string) => stores.delete(cacheName),
    keys: async () => [...stores.keys()],
    match: async (key: string, options: { cacheName: string }) => matchIn(stores.get(options.cacheName), key),
    open: async (cacheName: string) => {
      const store = stores.get(cacheName) ?? new Map<string, Response>();
      stores.set(cacheName, store);
      return {
        keys: async () => [...store.keys()].map((key) => ({ url: new URL(key, ORIGIN).href })),
        match: async (key: string) => matchIn(store, key),
        put: async (key: string, response: Response) => {
          store.set(key, response);
        },
      };
    },
  };
}

function loadServiceWorker(fetch: FetchMock, caches: ReturnType<typeof createCacheStorage>) {
  const listeners = new Map<string, Listener>();
  const worker = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    clients: {
      claim: vi.fn(),
    },
    location: {
      href: `${ORIGIN}/sw.js?build=2`,
      origin: ORIGIN,
    },
    skipWaiting: vi.fn(),
  };

  vm.runInNewContext(SERVICE_WORKER_SOURCE, {
    Date,
    Error,
    Math,
    Number,
    Promise,
    Response,
    Set,
    URL,
    caches,
    fetch,
    self: worker,
  });

  return listeners;
}

function loadFetchHandler(fetch: FetchMock) {
  const caches = createCacheStorage({
    [SHELL_CACHE_NAME]: {
      "/index.html": new Response("cached shell", { headers: { "content-type": "text/html" } }),
    },
  });
  const fetchHandler = loadServiceWorker(fetch, caches).get("fetch");
  if (!fetchHandler) {
    throw new Error("Service worker fetch handler was not registered");
  }

  return fetchHandler;
}

async function installServiceWorker(fetch: FetchMock) {
  const caches = createCacheStorage();
  const installHandler = loadServiceWorker(fetch, caches).get("install");
  if (!installHandler) {
    throw new Error("Service worker install handler was not registered");
  }

  const backgroundPromises: Promise<unknown>[] = [];
  installHandler({
    waitUntil: (promise) => {
      backgroundPromises.push(promise);
    },
  });
  await Promise.all(backgroundPromises);

  return caches;
}

function createInstallFetch({ redirected = false } = {}) {
  return vi.fn(async (url: string) => {
    if (url !== "/") {
      return new Response("export {};", { headers: { "content-type": "application/javascript" } });
    }

    const response = new Response(APP_SHELL_HTML, { headers: { "content-type": "text/html" } });
    if (redirected) {
      // fetch() reports a followed redirect, such as the edge `/` -> `/trade` rule, through this read-only flag.
      Object.defineProperty(response, "redirected", { value: true });
    }
    return response;
  });
}

async function dispatchNavigation(fetchHandler: (event: FetchEvent) => void, url = `${ORIGIN}/trade`) {
  let responsePromise: Promise<Response> | undefined;
  const backgroundPromises: Promise<unknown>[] = [];

  fetchHandler({
    request: {
      destination: "document",
      method: "GET",
      mode: "navigate",
      url,
    },
    respondWith: (response) => {
      responsePromise = response;
    },
    waitUntil: (promise) => {
      backgroundPromises.push(promise);
    },
  });

  if (!responsePromise) {
    throw new Error("Navigation was not handled");
  }

  const response = await responsePromise;
  await Promise.all(backgroundPromises);
  return response;
}

describe("PWA service worker install", () => {
  it("caches the app shell and its assets", async () => {
    const caches = await installServiceWorker(createInstallFetch());

    const cachedShell = await caches.match("/index.html", { cacheName: SHELL_CACHE_NAME });
    expect(await cachedShell?.text()).toBe(APP_SHELL_HTML);
    expect(await caches.match(APP_SHELL_ASSET_URL, { cacheName: SHELL_CACHE_NAME })).toBeDefined();
  });

  it("stores a shell that followed an edge redirect as a plain response", async () => {
    const caches = await installServiceWorker(createInstallFetch({ redirected: true }));

    const cachedShell = await caches.match("/index.html", { cacheName: SHELL_CACHE_NAME });
    expect(cachedShell?.redirected).toBe(false);
    expect(cachedShell?.status).toBe(200);
    expect(cachedShell?.headers.get("content-type")).toBe("text/html");
    expect(await cachedShell?.text()).toBe(APP_SHELL_HTML);
  });

  it("serves a shell that followed an edge redirect on navigation", async () => {
    const fetch = createInstallFetch({ redirected: true });
    const caches = await installServiceWorker(fetch);
    const fetchHandler = loadServiceWorker(fetch, caches).get("fetch");
    if (!fetchHandler) {
      throw new Error("Service worker fetch handler was not registered");
    }

    const response = await dispatchNavigation(fetchHandler);

    expect(response.redirected).toBe(false);
    expect(await response.text()).toBe(APP_SHELL_HTML);
  });
});

describe("PWA service worker navigation", () => {
  it("returns the cached shell immediately and checks the network in the background", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(APP_SHELL_HTML, {
        headers: { "content-type": "text/html" },
      })
    );

    const response = await dispatchNavigation(loadFetchHandler(fetch));

    expect(await response.text()).toBe("cached shell");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns the cached shell when the background network check fails", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));

    const response = await dispatchNavigation(loadFetchHandler(fetch));

    expect(await response.text()).toBe("cached shell");
  });

  it("uses the network shell for a preload recovery navigation", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(APP_SHELL_HTML, {
        headers: { "content-type": "text/html" },
      })
    );

    const response = await dispatchNavigation(loadFetchHandler(fetch), `${ORIGIN}/trade?__gmx_pwa_recovery=1`);

    expect(await response.text()).toContain('content="2"');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the cached shell when a recovery navigation is offline", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));

    const response = await dispatchNavigation(loadFetchHandler(fetch), `${ORIGIN}/trade?__gmx_pwa_recovery=1`);

    expect(await response.text()).toBe("cached shell");
  });
});
