import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  createCaches,
  createFetchEvent,
  createLifecycleEvent,
  createSelf,
  loadServiceWorkerHarness,
  makeResponse,
  makeShellResponse,
  ORIGIN,
  type SwHandlers,
} from "./sw.testUtils";

const SHELL_CACHE = "gmx-pwa-shell-v1";
const ASSET_CACHE = "gmx-pwa-assets-v1";
const SHELL_METADATA_KEY = "/__gmx_pwa_shell_metadata__";
// Must match public/sw.js.
const MAX_ASSET_ENTRIES = 64;

let selfMock: ReturnType<typeof createSelf>;
let cachesMock: ReturnType<typeof createCaches>;
let fetchMock: Mock;

async function loadServiceWorker(): Promise<SwHandlers> {
  const harness = await loadServiceWorkerHarness();
  selfMock = harness.selfMock;
  cachesMock = harness.cachesMock;
  fetchMock = harness.fetchMock;
  return harness.handlers;
}

describe("service worker (public/sw.js)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("pre-caches the app shell and skips waiting on install", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeShellResponse(["/assets/app.js", "/assets/app.css"]);
    const script = makeResponse();
    const styles = makeResponse();
    fetchMock.mockResolvedValueOnce(shell).mockResolvedValueOnce(script).mockResolvedValueOnce(styles);

    const event = createLifecycleEvent();
    handlers.install(event);
    await event.settle();

    expect(selfMock.skipWaiting).toHaveBeenCalledTimes(1);
    expect(shell.clone).toHaveBeenCalledTimes(1);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")?.body).toBe(shell.body);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get(`${ORIGIN}/assets/app.js`)?.body).toBe(script.body);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get(`${ORIGIN}/assets/app.css`)?.body).toBe(styles.body);
  });

  it("does not install when the app shell cannot be fetched", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(false, "", "text/html"));

    const event = createLifecycleEvent();
    handlers.install(event);

    await expect(event.settle()).rejects.toThrow("Failed to fetch the app shell");
    expect(cachesMock.stores.has(SHELL_CACHE)).toBe(false);
  });

  it("does not install a partial app shell", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeShellResponse(["/assets/app.js"]);
    fetchMock.mockResolvedValueOnce(shell).mockResolvedValueOnce(makeResponse(false));

    const event = createLifecycleEvent();
    handlers.install(event);

    await expect(event.settle()).rejects.toThrow("Failed to fetch app shell asset");
    expect(cachesMock.stores.get(SHELL_CACHE)?.has("/index.html")).not.toBe(true);
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
    const event = createFetchEvent({
      method: "POST",
      url: `${ORIGIN}/assets/app.js`,
      mode: "cors",
      destination: "script",
    });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("ignores cross-origin requests", async () => {
    const handlers = await loadServiceWorker();
    const event = createFetchEvent({
      method: "GET",
      url: "https://rpc.example.com/data",
      mode: "cors",
      destination: "",
    });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores same-origin GETs that are neither navigations nor /assets/", async () => {
    const handlers = await loadServiceWorker();
    const event = createFetchEvent({ method: "GET", url: `${ORIGIN}/prices`, mode: "cors", destination: "" });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("navigation: returns the network response and caches it as the offline shell", async () => {
    const handlers = await loadServiceWorker();
    const networkResponse = makeShellResponse();
    fetchMock.mockResolvedValueOnce(networkResponse).mockResolvedValueOnce(makeResponse());
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(networkResponse.clone).toHaveBeenCalledTimes(1);
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")?.body).toBe(networkResponse.body);
  });

  it("navigation: ignores iframe documents", async () => {
    const handlers = await loadServiceWorker();
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/charting_library/sameorigin.html`,
      mode: "navigate",
      destination: "iframe",
    });

    handlers.fetch(event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("navigation: does not replace the shell with a non-HTML response", async () => {
    const handlers = await loadServiceWorker();
    const previousShell = makeShellResponse(["/assets/previous.js"]);
    cachesMock.seed(SHELL_CACHE, "/index.html", previousShell);
    fetchMock.mockResolvedValueOnce(makeResponse(true, "{}", "application/json"));
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/manifest.json`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")?.body).toBe(previousShell.body);
    expect(selfMock.registration.unregister).not.toHaveBeenCalled();
  });

  it("navigation: keeps the previous shell when a new shell asset cannot be fetched", async () => {
    const handlers = await loadServiceWorker();
    const previousShell = makeShellResponse(["/assets/previous.js"]);
    const networkResponse = makeShellResponse(["/assets/new.js"]);
    cachesMock.seed(SHELL_CACHE, "/index.html", previousShell);
    fetchMock
      .mockResolvedValueOnce(networkResponse)
      .mockResolvedValueOnce(makeResponse(true, "<html></html>", "text/html"));
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")?.body).toBe(previousShell.body);
  });

  it("navigation: removes partially staged assets when a new shell asset cannot be cached", async () => {
    const handlers = await loadServiceWorker();
    const previousShell = makeShellResponse(["/assets/previous.js"]);
    const networkResponse = makeShellResponse(["/assets/new.js", "/assets/fails.js"]);
    const currentAssetUrl = `${ORIGIN}/assets/previous.js`;
    const retainedAssetUrl = `${ORIGIN}/assets/retained.js`;
    const newAssetUrl = `${ORIGIN}/assets/new.js`;
    const failedAssetUrl = `${ORIGIN}/assets/fails.js`;
    cachesMock.seed(SHELL_CACHE, "/index.html", previousShell);
    cachesMock.seed(SHELL_CACHE, currentAssetUrl, makeResponse());
    cachesMock.seed(SHELL_CACHE, retainedAssetUrl, makeResponse());
    cachesMock.seed(
      SHELL_CACHE,
      SHELL_METADATA_KEY,
      makeResponse(
        true,
        JSON.stringify({ currentAssets: [currentAssetUrl], previousAssets: [retainedAssetUrl] }),
        "application/json"
      )
    );
    cachesMock.failPut(failedAssetUrl);
    fetchMock
      .mockResolvedValueOnce(networkResponse)
      .mockResolvedValueOnce(makeResponse())
      .mockResolvedValueOnce(makeResponse());
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.get("/index.html")?.body).toBe(previousShell.body);
    expect(cachesMock.stores.get(SHELL_CACHE)?.has(currentAssetUrl)).toBe(true);
    expect(cachesMock.stores.get(SHELL_CACHE)?.has(retainedAssetUrl)).toBe(true);
    expect(cachesMock.stores.get(SHELL_CACHE)?.has(newAssetUrl)).toBe(false);
    expect(cachesMock.stores.get(SHELL_CACHE)?.has(failedAssetUrl)).toBe(false);
  });

  it("navigation: does not cache a non-ok network response", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(false, "", "text/html"));
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    expect(cachesMock.stores.get(SHELL_CACHE)?.has("/index.html")).not.toBe(true);
  });

  it("navigation: serves the cached shell when the network fails", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeShellResponse();
    cachesMock.seed(SHELL_CACHE, "/index.html", shell);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toMatchObject({ body: shell.body });
  });

  it("navigation: serves the cached shell for a server error", async () => {
    const handlers = await loadServiceWorker();
    const shell = makeShellResponse();
    cachesMock.seed(SHELL_CACHE, "/index.html", shell);
    fetchMock.mockResolvedValueOnce(makeResponse(false, "", "text/html", 503));
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toMatchObject({ body: shell.body });
  });

  it("navigation: rejects when the network fails and no shell is cached", async () => {
    const handlers = await loadServiceWorker();
    cachesMock.seed("other-app-v1", "/index.html", makeResponse());
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).rejects.toThrow("offline");
  });

  it("navigation: unregisters and clears PWA caches after a direct rollback", async () => {
    const handlers = await loadServiceWorker();
    cachesMock.seed(SHELL_CACHE, "/index.html", makeShellResponse());
    cachesMock.seed(ASSET_CACHE, `${ORIGIN}/assets/app.js`, makeResponse());
    cachesMock.seed("other-app-v1", "/index.html", makeResponse());
    const releaseShell = makeShellResponse(["/assets/release.js"], false);
    fetchMock.mockResolvedValueOnce(releaseShell);
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(releaseShell);
    await event.settle();
    expect(selfMock.registration.unregister).toHaveBeenCalledTimes(1);
    expect(cachesMock.deleteCacheSpy).toHaveBeenCalledWith(SHELL_CACHE);
    expect(cachesMock.deleteCacheSpy).toHaveBeenCalledWith(ASSET_CACHE);
    expect(cachesMock.deleteCacheSpy).not.toHaveBeenCalledWith("other-app-v1");
  });

  it("navigation: clears PWA caches when rollback unregistration fails", async () => {
    const handlers = await loadServiceWorker();
    selfMock.registration.unregister.mockRejectedValueOnce(new Error("unregistration failed"));
    cachesMock.seed(SHELL_CACHE, "/index.html", makeShellResponse());
    cachesMock.seed(ASSET_CACHE, `${ORIGIN}/assets/app.js`, makeResponse());
    const releaseShell = makeShellResponse(["/assets/release.js"], false);
    fetchMock.mockResolvedValueOnce(releaseShell);
    const event = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(releaseShell);
    await event.settle();
    expect(cachesMock.deleteCacheSpy).toHaveBeenCalledWith(SHELL_CACHE);
    expect(cachesMock.deleteCacheSpy).toHaveBeenCalledWith(ASSET_CACHE);
  });

  it("navigation: keeps only the current and previous shell asset generations", async () => {
    const handlers = await loadServiceWorker();
    const shellCache = cachesMock.stores;
    cachesMock.seed(SHELL_CACHE, "/index.html", makeShellResponse(["/assets/old.js"]));
    cachesMock.seed(SHELL_CACHE, `${ORIGIN}/assets/old.js`, makeResponse());
    cachesMock.seed(SHELL_CACHE, `${ORIGIN}/assets/stale.js`, makeResponse());

    const firstResponse = makeShellResponse(["/assets/new.js"]);
    fetchMock.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(makeResponse());
    const firstEvent = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });
    handlers.fetch(firstEvent);
    await firstEvent.getResponse();
    await firstEvent.settle();

    expect(shellCache.get(SHELL_CACHE)?.has(`${ORIGIN}/assets/old.js`)).toBe(true);
    expect(shellCache.get(SHELL_CACHE)?.has(`${ORIGIN}/assets/new.js`)).toBe(true);
    expect(shellCache.get(SHELL_CACHE)?.has(`${ORIGIN}/assets/stale.js`)).toBe(false);
    expect(shellCache.get(SHELL_CACHE)?.has(SHELL_METADATA_KEY)).toBe(true);

    const secondResponse = makeShellResponse(["/assets/next.js"]);
    fetchMock.mockResolvedValueOnce(secondResponse).mockResolvedValueOnce(makeResponse());
    const secondEvent = createFetchEvent({
      method: "GET",
      url: `${ORIGIN}/trade`,
      mode: "navigate",
      destination: "document",
    });
    handlers.fetch(secondEvent);
    await secondEvent.getResponse();
    await secondEvent.settle();

    expect(shellCache.get(SHELL_CACHE)?.has(`${ORIGIN}/assets/old.js`)).toBe(false);
    expect(shellCache.get(SHELL_CACHE)?.has(`${ORIGIN}/assets/new.js`)).toBe(true);
    expect(shellCache.get(SHELL_CACHE)?.has(`${ORIGIN}/assets/next.js`)).toBe(true);
  });

  it("asset: serves a cache hit without hitting the network", async () => {
    const handlers = await loadServiceWorker();
    const cached = makeResponse(true);
    const url = `${ORIGIN}/assets/app.abc123.js`;
    cachesMock.seed(ASSET_CACHE, url, cached);
    const event = createFetchEvent({ method: "GET", url, mode: "cors", destination: "script" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toMatchObject({ body: cached.body });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asset: fetches and caches on a miss", async () => {
    const handlers = await loadServiceWorker();
    const networkResponse = makeResponse(true);
    fetchMock.mockResolvedValueOnce(networkResponse);
    const url = `${ORIGIN}/assets/app.def456.js`;
    cachesMock.seed("other-app-v1", url, makeResponse());
    const event = createFetchEvent({ method: "GET", url, mode: "cors", destination: "script" });

    handlers.fetch(event);

    await expect(event.getResponse()).resolves.toBe(networkResponse);
    await event.settle();
    expect(networkResponse.clone).toHaveBeenCalledTimes(1);
    expect(cachesMock.stores.get(ASSET_CACHE)?.get(url)?.body).toBe(networkResponse.body);
  });

  it("asset: does not cache a non-ok response", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(false));
    const url = `${ORIGIN}/assets/missing.js`;
    const event = createFetchEvent({ method: "GET", url, mode: "cors", destination: "script" });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    expect(cachesMock.stores.get(ASSET_CACHE)?.has(url)).not.toBe(true);
  });

  it("asset: does not cache a successful HTML response", async () => {
    const handlers = await loadServiceWorker();
    fetchMock.mockResolvedValueOnce(makeResponse(true, "<html></html>", "text/html"));
    const url = `${ORIGIN}/assets/missing.js`;
    const event = createFetchEvent({ method: "GET", url, mode: "cors", destination: "script" });

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
    const event = createFetchEvent({ method: "GET", url: newUrl, mode: "cors", destination: "script" });

    handlers.fetch(event);

    await event.getResponse();
    await event.settle();
    const store = cachesMock.stores.get(ASSET_CACHE);
    expect(store?.size).toBe(MAX_ASSET_ENTRIES);
    expect(store?.has(`${ORIGIN}/assets/old-0.js`)).toBe(false);
    expect(store?.has(newUrl)).toBe(true);
  });
});
