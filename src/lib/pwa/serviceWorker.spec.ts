import { readFileSync } from "node:fs";
import { cwd } from "node:process";
import vm from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

const SERVICE_WORKER_SOURCE = readFileSync(`${cwd()}/public/sw.js`, "utf8");
const ORIGIN = "https://app.example";
const ASSET_URL = `${ORIGIN}/assets/index-abc123.js`;
const OLD_HTML = '<script src="/assets/old.js"></script><div id="root">Old app</div>';
const NAVIGATION = { destination: "document", method: "GET", mode: "navigate", url: `${ORIGIN}/trade` };
const SCRIPT_REQUEST = { destination: "script", method: "GET", mode: "cors", url: ASSET_URL };

type FetchEvent = {
  request: typeof NAVIGATION;
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};
type Listener = (event: FetchEvent | Pick<FetchEvent, "waitUntil">) => void;
type FetchMock = (request: string | FetchEvent["request"], options?: RequestInit) => Promise<Response>;
type CacheEntries = Record<string, Record<string, Response>>;

const cacheInstances: ReturnType<typeof createCacheStorage>[] = [];

function createCacheStorage(entries: CacheEntries = {}) {
  const put = vi.fn().mockRejectedValue(new Error("The enabled worker must not write cache entries"));
  const deleteCache = vi.fn().mockRejectedValue(new Error("The enabled worker must not delete caches"));
  const caches = {
    existingNames: Object.keys(entries),
    put,
    keys: vi.fn(async () => Object.keys(entries)),
    match: vi.fn(async (request: string | { url: string }, { cacheName }: { cacheName: string }) => {
      const url = new URL(typeof request === "string" ? request : request.url, ORIGIN).href;
      return entries[cacheName]?.[url]?.clone();
    }),
    open: vi.fn(async (name: string) => {
      if (!(name in entries)) {
        throw new Error("The enabled worker must not create caches");
      }
      return {
        keys: async () => Object.keys(entries[name]).map((url) => ({ url })),
        put,
        delete: deleteCache,
      };
    }),
    delete: deleteCache,
  };
  return caches;
}

function createLegacyCaches(entries: CacheEntries = {}) {
  const caches = createCacheStorage(entries);
  cacheInstances.push(caches);
  return caches;
}

function loadServiceWorker(fetch: FetchMock, caches = createLegacyCaches(), scriptUrl = "/sw.js?build=2") {
  const listeners = new Map<string, Listener>();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const claim = vi.fn().mockResolvedValue(undefined);
  vm.runInNewContext(SERVICE_WORKER_SOURCE, {
    AbortController,
    DOMException,
    Error,
    Promise,
    Response,
    URL,
    caches,
    clearTimeout,
    fetch,
    setTimeout,
    self: {
      addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
      clients: { claim },
      location: { href: `${ORIGIN}${scriptUrl}`, origin: ORIGIN },
      skipWaiting,
    },
  });

  return {
    caches,
    claim,
    skipWaiting,
    dispatchFetch(request: FetchEvent["request"]) {
      const respondWith = vi.fn<(response: Promise<Response>) => void>();
      listeners.get("fetch")?.({ request, respondWith, waitUntil: vi.fn() });
      return respondWith.mock.calls[0]?.[0];
    },
    async dispatchLifecycle(type: "install" | "activate") {
      const promises: Promise<unknown>[] = [];
      listeners.get(type)?.({ waitUntil: (promise) => promises.push(promise) });
      await Promise.all(promises);
    },
  };
}

function fetchResponse(worker: ReturnType<typeof loadServiceWorker>, request = NAVIGATION) {
  const response = worker.dispatchFetch(request);
  if (!response) {
    throw new Error("Fetch was not handled");
  }
  return response;
}

afterEach(() => {
  for (const caches of cacheInstances.splice(0)) {
    for (const [name] of caches.open.mock.calls) {
      expect(caches.existingNames).toContain(name);
    }
    expect(caches.put).not.toHaveBeenCalled();
    expect(caches.delete).not.toHaveBeenCalled();
  }
  vi.useRealTimers();
});

describe("PWA service worker lifecycle", () => {
  it.each(["/sw.js", "/sw.js?build=2", "/sw.js?build=invalid"])(
    "installs and activates without downloading or validating an app shell at %s",
    async (scriptUrl) => {
      const fetch = vi.fn().mockRejectedValue(new Error("offline"));
      const caches = createLegacyCaches({ "gmx-pwa-shell-v2-1": { [`${ORIGIN}/index.html`]: new Response(OLD_HTML) } });
      caches.keys.mockRejectedValue(new Error("CacheStorage unavailable"));
      const worker = loadServiceWorker(fetch, caches, scriptUrl);

      await worker.dispatchLifecycle("install");
      await worker.dispatchLifecycle("activate");

      expect(worker.skipWaiting).toHaveBeenCalledOnce();
      expect(worker.claim).toHaveBeenCalledOnce();
      expect(fetch).not.toHaveBeenCalled();
      expect(caches.match).not.toHaveBeenCalled();
    }
  );

  it.each([1, 2])("rejects installation of build %i when build 2 has disabled PWA", async (buildId) => {
    const caches = createLegacyCaches({
      "gmx-pwa-control-v2": { [`${ORIGIN}/__gmx_pwa_disabled__/2`]: new Response("disabled") },
    });
    const fetch = vi.fn().mockRejectedValue(new Error("unexpected fetch"));
    const worker = loadServiceWorker(fetch, caches, `/sw.js?build=${buildId}`);

    await expect(worker.dispatchLifecycle("install")).rejects.toThrow("PWA has been disabled");

    expect(worker.skipWaiting).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows a newer build to install despite an older disabled marker", async () => {
    const caches = createLegacyCaches({
      "gmx-pwa-control-v2": { [`${ORIGIN}/__gmx_pwa_disabled__/1`]: new Response("disabled") },
    });
    const worker = loadServiceWorker(vi.fn().mockRejectedValue(new Error("unexpected fetch")), caches);

    await worker.dispatchLifecycle("install");

    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });
});

describe("PWA service worker navigation", () => {
  it.each(["/trade", "/trade?__gmx_pwa_recovery=1", "/buy?foo=bar#bridge"])(
    "serves fresh network HTML despite old HTTP and service-worker caches at %s",
    async (path) => {
      const freshHtml = '<div id="root">Current app</div>';
      const fetch = vi.fn(
        async (_request: string | FetchEvent["request"], options?: RequestInit) =>
          new Response(options?.cache === "no-store" ? freshHtml : OLD_HTML, {
            headers: { "content-type": "text/html" },
          })
      );
      const caches = createLegacyCaches({ "gmx-pwa-shell-v2-1": { [`${ORIGIN}/index.html`]: new Response(OLD_HTML) } });
      const worker = loadServiceWorker(fetch, caches);

      const response = await fetchResponse(worker, { ...NAVIGATION, url: `${ORIGIN}${path}` });

      expect(await response.text()).toBe(freshHtml);
      expect(caches.keys).not.toHaveBeenCalled();
      expect(caches.match).not.toHaveBeenCalled();
    }
  );

  it("loads network HTML when CacheStorage is unavailable", async () => {
    const networkResponse = new Response("Current app");
    const caches = createLegacyCaches();
    caches.keys.mockRejectedValue(new Error("CacheStorage unavailable"));
    caches.match.mockRejectedValue(new Error("CacheStorage unavailable"));

    const response = await fetchResponse(loadServiceWorker(vi.fn().mockResolvedValue(networkResponse), caches));

    expect(response).toBe(networkResponse);
  });

  it.each([404, 500, 503])("preserves network HTTP %i instead of serving a cached app", async (status) => {
    const networkResponse = new Response("server response", { status });
    const caches = createLegacyCaches({ "gmx-pwa-shell-v2-1": { [`${ORIGIN}/index.html`]: new Response(OLD_HTML) } });

    const response = await fetchResponse(loadServiceWorker(vi.fn().mockResolvedValue(networkResponse), caches));

    expect(response).toBe(networkResponse);
    expect(await response.text()).toBe("server response");
  });

  it("returns a self-contained retry page offline and never runs cached app HTML", async () => {
    const caches = createLegacyCaches({ "gmx-pwa-shell-v2-1": { [`${ORIGIN}/index.html`]: new Response(OLD_HTML) } });
    const worker = loadServiceWorker(vi.fn().mockRejectedValue(new Error("offline")), caches);

    const response = await fetchResponse(worker, { ...NAVIGATION, url: `${ORIGIN}/trade?market=ETH#chart` });
    const html = await response.text();
    const page = new DOMParser().parseFromString(html, "text/html");

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(html).toContain("Unable to connect");
    const retry = page.querySelector("button");
    expect(retry?.textContent).toContain("Retry");
    const reload = vi.fn();
    vm.runInNewContext(retry?.getAttribute("onclick") ?? "", { window: { location: { reload } } });
    expect(reload).toHaveBeenCalledOnce();
    expect(page.querySelector("script, link, img")).toBeNull();
    expect(html).not.toContain("Old app");
    expect(caches.match).not.toHaveBeenCalled();
  });

  it("aborts a stalled navigation after 10 seconds and returns the retry page", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const fetch = vi.fn((_request: string | FetchEvent["request"], options?: RequestInit) => {
      signal = options?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const responsePromise = fetchResponse(loadServiceWorker(fetch));

    await vi.advanceTimersByTimeAsync(9_999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const response = await responsePromise;

    expect(signal?.aborted).toBe(true);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Unable to connect");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the navigation deadline after a network response", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      async (_request: string | FetchEvent["request"], _options?: RequestInit) => new Response("app")
    );

    await fetchResponse(loadServiceWorker(fetch));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the deadline active when HTML headers arrive but its body stalls", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (_request: string | FetchEvent["request"], options?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("<!doctype html>"));
          options?.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")));
        },
      });
      return new Response(body, { headers: { "content-type": "text/html" } });
    });
    const responsePromise = fetchResponse(loadServiceWorker(fetch));
    const onResponse = vi.fn();
    void responsePromise.then(onResponse);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(onResponse).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Unable to connect");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves the original HTML response and redirect metadata after downloading its body", async () => {
    const networkResponse = new Response("<h1>Current app</h1>", { headers: { "content-type": "text/html" } });
    Object.defineProperty(networkResponse, "redirected", { value: true });

    const response = await fetchResponse(loadServiceWorker(vi.fn().mockResolvedValue(networkResponse)));

    expect(response).toBe(networkResponse);
    expect(response.redirected).toBe(true);
    expect(await response.text()).toBe("<h1>Current app</h1>");
  });
});

describe("PWA legacy asset migration", () => {
  it.each([
    { extension: "js", contentType: "application/javascript", body: "export {};" },
    { extension: "css", contentType: "text/css", body: "body {}" },
  ])("uses the network for $extension even when a legacy copy exists", async ({ extension, contentType, body }) => {
    const request = { ...SCRIPT_REQUEST, url: `${ORIGIN}/assets/index-abc123.${extension}` };
    const caches = createLegacyCaches({ "gmx-pwa-shell-v2-1": { [request.url]: new Response("old") } });
    const networkResponse = new Response(body, { headers: { "content-type": contentType } });
    const fetch = vi.fn().mockResolvedValue(networkResponse);

    const response = await fetchResponse(loadServiceWorker(fetch, caches), request);

    expect(response).toBe(networkResponse);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(request);
    expect(caches.keys).not.toHaveBeenCalled();
  });

  it.each([
    { cacheName: "gmx-pwa-shell-v2-1", status: 404, extension: "js", contentType: "application/javascript" },
    { cacheName: "gmx-pwa-assets-v2-2", status: 200, extension: "css", contentType: "text/css" },
    { cacheName: "gmx-pwa-assets-v2-2", status: 503, extension: "js", contentType: "text/javascript" },
  ])(
    "rescues $extension from $cacheName when the network returns unusable HTTP $status",
    async ({ cacheName, status, extension, contentType }) => {
      const request = { ...SCRIPT_REQUEST, url: `${ORIGIN}/assets/index-abc123.${extension}?version=1` };
      const caches = createLegacyCaches({
        [cacheName]: { [request.url]: new Response("legacy asset", { headers: { "content-type": contentType } }) },
      });
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response("<html>not an asset</html>", { status, headers: { "content-type": "text/html" } })
        );

      const response = await fetchResponse(loadServiceWorker(fetch, caches), request);

      expect(await response.text()).toBe("legacy asset");
      expect(caches.match).toHaveBeenCalledWith(request, { cacheName });
    }
  );

  it("rescues an old tab's exact script when its network request fails", async () => {
    const caches = createLegacyCaches({
      "gmx-pwa-assets-v2-1": {
        [ASSET_URL]: new Response("export {};", { headers: { "content-type": "text/javascript" } }),
      },
    });

    const response = await fetchResponse(
      loadServiceWorker(vi.fn().mockRejectedValue(new Error("offline")), caches),
      SCRIPT_REQUEST
    );

    expect(await response.text()).toBe("export {};");
  });

  it.each([
    "gmx-pwa-stage-v2-1-123",
    "gmx-pwa-chart-v2-1",
    "gmx-pwa-control-v2",
    "gmx-pwa-assets-v2-invalid",
    "another-cache",
  ])("does not rescue assets from %s", async (cacheName) => {
    const caches = createLegacyCaches({
      [cacheName]: { [ASSET_URL]: new Response("export {};", { headers: { "content-type": "text/javascript" } }) },
    });
    const networkResponse = new Response("not found", { status: 404 });

    const response = await fetchResponse(
      loadServiceWorker(vi.fn().mockResolvedValue(networkResponse), caches),
      SCRIPT_REQUEST
    );

    expect(response).toBe(networkResponse);
    expect(caches.match).not.toHaveBeenCalled();
  });

  it.each([
    { status: 200, contentType: "text/html" },
    { status: 200, contentType: "text/css" },
    { status: 404, contentType: "application/javascript" },
    { status: 206, contentType: "application/javascript" },
  ])("rejects a cached script with HTTP $status and MIME $contentType", async ({ status, contentType }) => {
    const caches = createLegacyCaches({
      "gmx-pwa-assets-v2-1": {
        [ASSET_URL]: new Response("unusable", { status, headers: { "content-type": contentType } }),
      },
    });
    const networkResponse = new Response("not found", { status: 404 });

    const response = await fetchResponse(
      loadServiceWorker(vi.fn().mockResolvedValue(networkResponse), caches),
      SCRIPT_REQUEST
    );

    expect(response).toBe(networkResponse);
  });

  it("does not reuse an asset cached under a different query string", async () => {
    const caches = createLegacyCaches({
      "gmx-pwa-assets-v2-1": {
        [ASSET_URL]: new Response("export {};", { headers: { "content-type": "text/javascript" } }),
      },
    });
    const error = new Error("offline");

    await expect(
      fetchResponse(loadServiceWorker(vi.fn().mockRejectedValue(error), caches), {
        ...SCRIPT_REQUEST,
        url: `${ASSET_URL}?version=2`,
      })
    ).rejects.toBe(error);
  });

  it("preserves the original network failure when CacheStorage is unavailable", async () => {
    const caches = createLegacyCaches();
    caches.keys.mockRejectedValue(new Error("CacheStorage unavailable"));
    const error = new Error("network failed");

    await expect(
      fetchResponse(loadServiceWorker(vi.fn().mockRejectedValue(error), caches), SCRIPT_REQUEST)
    ).rejects.toBe(error);
  });
});

describe("PWA service worker request boundaries", () => {
  it.each([
    { ...NAVIGATION, method: "POST" },
    { ...NAVIGATION, url: "https://other.example/trade" },
    { ...NAVIGATION, destination: "iframe" },
    { ...SCRIPT_REQUEST, url: `${ORIGIN}/api/prices` },
    { ...SCRIPT_REQUEST, url: `${ORIGIN}/charting_library/chart.js` },
    { ...SCRIPT_REQUEST, url: `${ORIGIN}/assets/icon.svg` },
    { ...SCRIPT_REQUEST, url: `${ORIGIN}/assets/font.woff2` },
    { ...SCRIPT_REQUEST, url: `${ORIGIN}/assets/data.json` },
  ])("leaves $method $url ($destination) to the browser", (request) => {
    const fetch = vi.fn().mockRejectedValue(new Error("unexpected fetch"));
    const worker = loadServiceWorker(fetch);

    expect(worker.dispatchFetch(request)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(worker.caches.keys).not.toHaveBeenCalled();
  });
});
