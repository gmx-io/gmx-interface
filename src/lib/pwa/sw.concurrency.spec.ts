import { afterEach, describe, expect, it, vi } from "vitest";

import { createFetchEvent, loadServiceWorkerHarness, makeResponse, makeShellResponse, ORIGIN } from "./sw.testUtils";

const SHELL_CACHE = "gmx-pwa-shell-v1";
const ASSET_CACHE = "gmx-pwa-assets-v1";
const SHELL_METADATA_KEY = "/__gmx_pwa_shell_metadata__";

function getRequestUrl(request: unknown) {
  return typeof request === "string" ? request : (request as { url: string }).url;
}

function makeNavigation(path: string) {
  return createFetchEvent({
    method: "GET",
    url: `${ORIGIN}${path}`,
    mode: "navigate",
    destination: "document",
  });
}

describe("service worker cache concurrency", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("serializes shell generations and commits the latest complete generation", async () => {
    const { handlers, cachesMock, fetchMock } = await loadServiceWorkerHarness();
    const oldAssetUrl = `${ORIGIN}/assets/old.js`;
    const nextAssetUrl = `${ORIGIN}/assets/next.js`;
    const latestAssetUrl = `${ORIGIN}/assets/latest.js`;
    const oldShell = makeShellResponse([oldAssetUrl]);
    const nextShell = makeShellResponse([nextAssetUrl]);
    const latestShell = makeShellResponse([latestAssetUrl]);
    cachesMock.seed(SHELL_CACHE, "/index.html", oldShell);
    cachesMock.seed(SHELL_CACHE, oldAssetUrl, makeResponse(true, "old"));
    const nextPut = cachesMock.delayPut(nextAssetUrl);
    let latestAssetFetches = 0;

    fetchMock.mockImplementation(async (request: unknown) => {
      switch (getRequestUrl(request)) {
        case `${ORIGIN}/trade/next`:
          return nextShell;
        case `${ORIGIN}/trade/latest`:
          return latestShell;
        case nextAssetUrl:
          return makeResponse(true, "next");
        case latestAssetUrl:
          latestAssetFetches += 1;
          return makeResponse(true, "latest");
        default:
          throw new Error(`Unexpected request: ${getRequestUrl(request)}`);
      }
    });

    const nextEvent = makeNavigation("/trade/next");
    handlers.fetch(nextEvent);
    await nextEvent.getResponse();
    await nextPut.started;

    const latestEvent = makeNavigation("/trade/latest");
    handlers.fetch(latestEvent);
    await latestEvent.getResponse();
    await Promise.resolve();

    expect(latestAssetFetches).toBe(0);

    nextPut.release();
    await Promise.all([nextEvent.settle(), latestEvent.settle()]);

    const shellCache = cachesMock.stores.get(SHELL_CACHE);
    expect(shellCache?.get("/index.html")?.body).toBe(latestShell.body);
    expect(shellCache?.has(oldAssetUrl)).toBe(false);
    expect(shellCache?.has(nextAssetUrl)).toBe(true);
    expect(shellCache?.has(latestAssetUrl)).toBe(true);
    expect(JSON.parse(shellCache?.get(SHELL_METADATA_KEY)?.body ?? "{}")).toEqual({
      currentAssets: [latestAssetUrl],
      previousAssets: [nextAssetUrl],
    });
  });

  it("recovers the previous generation when shell metadata is stale", async () => {
    const { handlers, cachesMock, fetchMock } = await loadServiceWorkerHarness();
    const currentAssetUrl = `${ORIGIN}/assets/current.js`;
    const previousAssetUrl = `${ORIGIN}/assets/previous.js`;
    const staleAssetUrl = `${ORIGIN}/assets/stale.js`;
    const currentShell = makeShellResponse([currentAssetUrl]);
    cachesMock.seed(SHELL_CACHE, "/index.html", currentShell);
    cachesMock.seed(SHELL_CACHE, currentAssetUrl, makeResponse(true, "current"));
    cachesMock.seed(SHELL_CACHE, previousAssetUrl, makeResponse(true, "previous"));
    cachesMock.seed(SHELL_CACHE, staleAssetUrl, makeResponse(true, "stale"));
    cachesMock.seed(
      SHELL_CACHE,
      SHELL_METADATA_KEY,
      makeResponse(
        true,
        JSON.stringify({ currentAssets: [previousAssetUrl], previousAssets: [staleAssetUrl] }),
        "application/json"
      )
    );
    fetchMock.mockResolvedValueOnce(currentShell);

    const event = makeNavigation("/trade/current");
    handlers.fetch(event);
    await event.getResponse();
    await event.settle();

    const shellCache = cachesMock.stores.get(SHELL_CACHE);
    expect(shellCache?.has(currentAssetUrl)).toBe(true);
    expect(shellCache?.has(previousAssetUrl)).toBe(true);
    expect(shellCache?.has(staleAssetUrl)).toBe(false);
    expect(JSON.parse(shellCache?.get(SHELL_METADATA_KEY)?.body ?? "{}")).toEqual({
      currentAssets: [currentAssetUrl],
      previousAssets: [previousAssetUrl],
    });
  });

  it("finishes in-flight writes before rollback clears caches and blocks later writes", async () => {
    const { handlers, selfMock, cachesMock, fetchMock } = await loadServiceWorkerHarness();
    const oldAssetUrl = `${ORIGIN}/assets/old.js`;
    const newAssetUrl = `${ORIGIN}/assets/new.js`;
    const runtimeAssetUrl = `${ORIGIN}/assets/runtime.js`;
    cachesMock.seed(SHELL_CACHE, "/index.html", makeShellResponse([oldAssetUrl]));
    cachesMock.seed(SHELL_CACHE, oldAssetUrl, makeResponse(true, "old"));
    cachesMock.seed(ASSET_CACHE, `${ORIGIN}/assets/cached.js`, makeResponse(true, "cached"));
    const newShell = makeShellResponse([newAssetUrl]);
    const rollbackShell = makeShellResponse(["/assets/release.js"], false);
    const newPut = cachesMock.delayPut(newAssetUrl);

    fetchMock.mockImplementation(async (request: unknown) => {
      switch (getRequestUrl(request)) {
        case `${ORIGIN}/trade/update`:
          return newShell;
        case `${ORIGIN}/trade/rollback`:
          return rollbackShell;
        case newAssetUrl:
          return makeResponse(true, "new");
        case runtimeAssetUrl:
          return makeResponse(true, "runtime");
        default:
          throw new Error(`Unexpected request: ${getRequestUrl(request)}`);
      }
    });

    const updateEvent = makeNavigation("/trade/update");
    handlers.fetch(updateEvent);
    await updateEvent.getResponse();
    await newPut.started;

    const rollbackEvent = makeNavigation("/trade/rollback");
    handlers.fetch(rollbackEvent);
    await rollbackEvent.getResponse();
    await vi.waitFor(() => expect(selfMock.registration.unregister).toHaveBeenCalledTimes(1));

    newPut.release();
    await Promise.all([updateEvent.settle(), rollbackEvent.settle()]);
    expect([...cachesMock.stores.keys()].filter((name) => name.startsWith("gmx-pwa-"))).toEqual([]);

    const runtimeEvent = createFetchEvent({
      method: "GET",
      url: runtimeAssetUrl,
      mode: "cors",
      destination: "script",
    });
    handlers.fetch(runtimeEvent);
    await expect(runtimeEvent.getResponse()).resolves.toMatchObject({ body: "runtime" });
    await runtimeEvent.settle();

    expect([...cachesMock.stores.keys()].filter((name) => name.startsWith("gmx-pwa-"))).toEqual([]);
  });
});
