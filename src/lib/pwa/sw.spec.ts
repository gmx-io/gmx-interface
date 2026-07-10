import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

const ORIGIN = "https://app.gmx.io";
const SHELL_CACHE = "gmx-pwa-shell-v1";
const ASSET_CACHE = "gmx-pwa-assets-v1";
// Must match public/sw.js.
const MAX_ASSET_ENTRIES = 64;

type UrlLike = string | { url: string };

interface MockResponse {
  ok: boolean;
  clone(): MockResponse;
  text(): Promise<string>;
}

interface MockRequest {
  method: string;
  url: string;
  mode: string;
}

type SwHandlers = Record<string, (event: unknown) => void>;

function makeResponse(ok = true, body = ""): MockResponse {
  const response: MockResponse = {
    ok,
    clone: vi.fn(() => response),
    text: vi.fn(async () => body),
  };
  return response;
}

function keyToUrl(key: UrlLike): string {
  return typeof key === "string" ? key : key.url;
}

function createCaches() {
  const stores = new Map<string, Map<string, MockResponse>>();
  const failedPutUrls = new Set<string>();
  const deleteCacheSpy = vi.fn();

  const ensure = (name: string) => {
    let store = stores.get(name);
    if (!store) {
      store = new Map<string, MockResponse>();
      stores.set(name, store);
    }
    return store;
  };

  const open = async (name: string) => {
    const store = ensure(name);
    return {
      put: async (request: UrlLike, response: MockResponse) => {
        const url = keyToUrl(request);
        if (failedPutUrls.has(url)) {
          throw new Error(`Failed to cache ${url}`);
        }
        store.set(url, response);
      },
      match: async (request: UrlLike) => store.get(keyToUrl(request)),
      keys: async () => [...store.keys()].map((url) => ({ url })),
      delete: async (request: UrlLike) => store.delete(keyToUrl(request)),
    };
  };

  return {
    stores,
    deleteCacheSpy,
    failPut(url: string) {
      failedPutUrls.add(url);
    },
    seed(name: string, url: string, response: MockResponse) {
      ensure(name).set(url, response);
    },
    keys: async () => [...stores.keys()],
    open: vi.fn(open),
    delete: async (name: string) => {
      deleteCacheSpy(name);
      return stores.delete(name);
    },
  };
}

function createSelf() {
  const handlers: SwHandlers = {};
  return {
    handlers,
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      handlers[type] = handler;
    },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
    location: { origin: ORIGIN },
  };
}

interface FetchEventLike {
  request: MockRequest;
  respondWith: Mock;
  waitUntil: Mock;
  getResponse: () => Promise<MockResponse> | undefined;
  settle: () => Promise<unknown[]>;
}

function createFetchEvent(request: MockRequest): FetchEventLike {
  const waits: Array<Promise<unknown>> = [];
  let response: Promise<MockResponse> | undefined;
  return {
    request,
    respondWith: vi.fn((promise: Promise<MockResponse>) => {
      response = promise;
    }),
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      waits.push(promise);
    }),
    getResponse: () => response,
    settle: () => Promise.all(waits),
  };
}

function createLifecycleEvent() {
  const waits: Array<Promise<unknown>> = [];
  return {
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      waits.push(promise);
    }),
    settle: () => Promise.all(waits),
  };
}

let selfMock: ReturnType<typeof createSelf>;
let cachesMock: ReturnType<typeof createCaches>;
let fetchMock: Mock;

async function loadServiceWorker(): Promise<SwHandlers> {
  selfMock = createSelf();
  cachesMock = createCaches();
  fetchMock = vi.fn();
  vi.stubGlobal("self", selfMock);
  vi.stubGlobal("caches", cachesMock);
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  // @ts-expect-error sw.js is a classic worker script
  await import("../../../public/sw.js");
  return selfMock.handlers;
}

describe("service worker (public/sw.js)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("pre-caches the app shell and skips waiting on install", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeResponse(
      true,
      '<script src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css">'
    );
    const script = makeResponse();
    const styles = makeResponse();
    fetchMock.mockResolvedValueOnce(shell).mockResolvedValueOnce(script).mockResolvedValueOnce(styles);

    const event = createLifecycleEvent();
    handlers.install(event);
    await event.settle();

    expect(selfMock.skipWaiting).toHaveBeenCalledTimes(1);
    expect(shell.clone).toHaveBeenCalledTimes(1);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")).toBe(shell);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get(`${ORIGIN}/assets/app.js`)).toBe(script);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get(`${ORIGIN}/assets/app.css`)).toBe(styles);
  });

  it("does not install when the app shell cannot be fetched", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(false));

    const event = createLifecycleEvent();
    handlers.install(event);

    await expect(event.settle()).rejects.toThrow("Failed to fetch the app shell");
    expect(cachesMock.stores.has(SHELL_CACHE)).toBe(false);
  });

  it("does not install a partial app shell", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeResponse(true, '<script src="/assets/app.js"></script>');
    fetchMock.mockResolvedValueOnce(shell).mockResolvedValueOnce(makeResponse(false));

    const event = createLifecycleEvent();
    handlers.install(event);

    await expect(event.settle()).rejects.toThrow("Failed to fetch app shell asset");
    expect(cachesMock.stores.has(SHELL_CACHE)).toBe(false);
  });

  it("deletes unknown caches, keeps the shell/asset caches, and claims clients on activate", async () => {
    const handlers = await loadServiceWorker();
    cachesMock.seed(SHELL_CACHE, "/index.html", makeResponse());
    cachesMock.seed(ASSET_CACHE, `${ORIGIN}/assets/app.js`, makeResponse());
    cachesMock.seed("gmx-pwa-v1", "/legacy", makeResponse());
    cachesMock.seed("other-app-v1", "/index.html", makeResponse());

    const event = createLifecycleEvent();
    handlers.activate(event);
    await event.settle();

    expect(cachesMock.deleteCacheSpy).toHaveBeenCalledWith("gmx-pwa-v1");
    expect(cachesMock.deleteCacheSpy).not.toHaveBeenCalledWith(SHELL_CACHE);
    expect(cachesMock.deleteCacheSpy).not.toHaveBeenCalledWith(ASSET_CACHE);
    expect(cachesMock.deleteCacheSpy).not.toHaveBeenCalledWith("other-app-v1");
    expect(selfMock.clients.claim).toHaveBeenCalledTimes(1);
  });

  it("ignores non-GET requests", async () => {
    const handlers = await loadServiceWorker();
    const event = createFetchEvent({ method: "POST", url: `${ORIGIN}/assets/app.js`, mode: "cors" });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("ignores cross-origin requests", async () => {
    const handlers = await loadServiceWorker();
    const event = createFetchEvent({ method: "GET", url: "https://rpc.example.com/data", mode: "cors" });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores same-origin GETs that are neither navigations nor /assets/", async () => {
    const handlers = await loadServiceWorker();
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/prices`, mode: "cors" });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("navigation: returns the network response and caches it as the offline shell", async () => {
    const handlers = await loadServiceWorker();
    const networkResponse = makeResponse(true);
    fetchMock.mockResolvedValueOnce(networkResponse);
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/trade`, mode: "navigate" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(networkResponse.clone).toHaveBeenCalledTimes(2);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")).toBe(networkResponse);
  });

  it("navigation: keeps the previous shell when a new shell asset cannot be fetched", async () => {
    const handlers = await loadServiceWorker();
    const previousShell = makeResponse();
    const networkResponse = makeResponse(true, '<script src="/assets/new.js"></script>');
    cachesMock.seed(SHELL_CACHE, "/index.html", previousShell);
    fetchMock.mockResolvedValueOnce(networkResponse).mockResolvedValueOnce(makeResponse(false));
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/trade`, mode: "navigate" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")).toBe(previousShell);
  });

  it("navigation: keeps the previous shell when a new shell asset cannot be cached", async () => {
    const handlers = await loadServiceWorker();
    const previousShell = makeResponse();
    const networkResponse = makeResponse(true, '<script src="/assets/new.js"></script>');
    const assetUrl = `${ORIGIN}/assets/new.js`;
    cachesMock.seed(SHELL_CACHE, "/index.html", previousShell);
    cachesMock.failPut(assetUrl);
    fetchMock.mockResolvedValueOnce(networkResponse).mockResolvedValueOnce(makeResponse());
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/trade`, mode: "navigate" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")).toBe(previousShell);
  });

  it("navigation: does not cache a non-ok network response", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(false));
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/trade`, mode: "navigate" });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.has("/index.html")).not.toBe(true);
  });

  it("navigation: serves the cached shell when the network fails", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeResponse(true);
    cachesMock.seed(SHELL_CACHE, "/index.html", shell);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/trade`, mode: "navigate" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(shell);
  });

  it("navigation: rejects when the network fails and no shell is cached", async () => {
    const handlers = await loadServiceWorker();
    cachesMock.seed("other-app-v1", "/index.html", makeResponse());
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/trade`, mode: "navigate" });

    handlers.fetch(event);

    await expect(event.getResponse()).rejects.toThrow("offline");
  });

  it("asset: serves a cache hit without hitting the network", async () => {
    const handlers = await loadServiceWorker();
    const cached = makeResponse(true);
    const url = `${ORIGIN}/assets/app.abc123.js`;
    cachesMock.seed(ASSET_CACHE, url, cached);
    const event = createFetchEvent({ method: "GET", url, mode: "cors" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(cached);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asset: fetches and caches on a miss", async () => {
    const handlers = await loadServiceWorker();
    const networkResponse = makeResponse(true);
    fetchMock.mockResolvedValueOnce(networkResponse);
    const url = `${ORIGIN}/assets/app.def456.js`;
    cachesMock.seed("other-app-v1", url, makeResponse());
    const event = createFetchEvent({ method: "GET", url, mode: "cors" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(networkResponse.clone).toHaveBeenCalledTimes(1);
    expect(cachesMock.stores.get(ASSET_CACHE)?.get(url)).toBe(networkResponse);
  });

  it("asset: does not cache a non-ok response", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(false));
    const url = `${ORIGIN}/assets/missing.js`;
    const event = createFetchEvent({ method: "GET", url, mode: "cors" });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    expect(cachesMock.stores.get(ASSET_CACHE)?.has(url)).not.toBe(true);
  });

  it("asset: evicts the oldest entry when the cache exceeds the cap", async () => {
    const handlers = await loadServiceWorker();
    for (let index = 0; index < MAX_ASSET_ENTRIES; index++) {
      cachesMock.seed(ASSET_CACHE, `${ORIGIN}/assets/old-${index}.js`, makeResponse());
    }
    fetchMock.mockResolvedValueOnce(makeResponse(true));
    const newUrl = `${ORIGIN}/assets/new.js`;
    const event = createFetchEvent({ method: "GET", url: newUrl, mode: "cors" });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    const store = cachesMock.stores.get(ASSET_CACHE);
    expect(store?.size).toBe(MAX_ASSET_ENTRIES);
    expect(store?.has(`${ORIGIN}/assets/old-0.js`)).toBe(false);
    expect(store?.has(newUrl)).toBe(true);
  });
});
