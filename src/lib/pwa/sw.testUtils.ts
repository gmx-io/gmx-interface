import { vi, type Mock } from "vitest";

export const ORIGIN = "https://app.gmx.io";

type UrlLike = string | { url: string };

export interface MockResponse {
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
  readonly bodyUsed: boolean;
  headers: { get(name: string): string | null };
  clone(): MockResponse;
  text(): Promise<string>;
}

type ResponseLike = MockResponse | Response;

interface MockRequest {
  method: string;
  url: string;
  mode: string;
  destination: string;
}

export type SwHandlers = Record<string, (event: unknown) => void>;

export function makeResponse(
  ok = true,
  body = "",
  contentType = "application/javascript",
  status = ok ? 200 : 404
): MockResponse {
  let bodyUsed = false;
  const response: MockResponse = {
    ok,
    status,
    body,
    contentType,
    get bodyUsed() {
      return bodyUsed;
    },
    headers: {
      get: vi.fn((name: string) => (name.toLowerCase() === "content-type" ? contentType : null)),
    },
    clone: vi.fn(() => {
      if (bodyUsed) {
        throw new TypeError("Response body has already been consumed");
      }
      return makeResponse(ok, body, contentType, status);
    }),
    text: vi.fn(async () => {
      if (bodyUsed) {
        throw new TypeError("Response body has already been consumed");
      }
      bodyUsed = true;
      return body;
    }),
  };
  return response;
}

export function makeShellResponse(assetUrls = ["/assets/app.js"], isPwaEnabled = true): MockResponse {
  const pwaMarker = isPwaEnabled ? '<meta name="gmx-pwa-enabled" content="true">' : "";
  const assets = assetUrls
    .map((url) => (url.endsWith(".css") ? `<link rel="stylesheet" href="${url}">` : `<script src="${url}"></script>`))
    .join("");

  return makeResponse(true, `${pwaMarker}<div id="root"></div>${assets}`, "text/html");
}

function keyToUrl(key: UrlLike): string {
  return typeof key === "string" ? key : key.url;
}

export function createCaches() {
  const stores = new Map<string, Map<string, MockResponse>>();
  const failedPutUrls = new Set<string>();
  const putGates = new Map<string, { started: () => void; wait: Promise<void> }>();
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
      put: async (request: UrlLike, response: ResponseLike) => {
        const url = keyToUrl(request);
        const gate = putGates.get(url);
        if (gate) {
          gate.started();
          await gate.wait;
        }
        if (failedPutUrls.has(url)) {
          throw new Error(`Failed to cache ${url}`);
        }

        const body = await response.text();
        const contentType = response.headers.get("content-type") ?? "";
        store.set(url, makeResponse(response.ok, body, contentType, response.status));
      },
      match: async (request: UrlLike) => store.get(keyToUrl(request))?.clone(),
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
    delayPut(url: string) {
      let markStarted: () => void;
      let release: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      putGates.set(url, { started: markStarted!, wait });
      return { started, release: release! };
    },
    seed(name: string, url: string, response: MockResponse) {
      ensure(name).set(url, makeResponse(response.ok, response.body, response.contentType, response.status));
    },
    keys: async () => [...stores.keys()],
    match: async (request: UrlLike, options?: { cacheName?: string }) => {
      if (options?.cacheName) {
        return stores.get(options.cacheName)?.get(keyToUrl(request))?.clone();
      }

      for (const store of stores.values()) {
        const response = store.get(keyToUrl(request));
        if (response) {
          return response.clone();
        }
      }
      return undefined;
    },
    open: vi.fn(open),
    delete: async (name: string) => {
      deleteCacheSpy(name);
      return stores.delete(name);
    },
  };
}

export function createSelf() {
  const handlers: SwHandlers = {};
  return {
    handlers,
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      handlers[type] = handler;
    },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
    registration: { unregister: vi.fn(async () => true) },
    location: { origin: ORIGIN },
  };
}

export async function loadServiceWorkerHarness() {
  const selfMock = createSelf();
  const cachesMock = createCaches();
  const fetchMock = vi.fn();
  vi.stubGlobal("self", selfMock);
  vi.stubGlobal("caches", cachesMock);
  vi.stubGlobal("fetch", fetchMock);
  vi.resetModules();
  // @ts-expect-error sw.js is a classic worker script
  await import("../../../public/sw.js");

  return { handlers: selfMock.handlers, selfMock, cachesMock, fetchMock };
}

interface FetchEventLike {
  request: MockRequest;
  respondWith: Mock;
  waitUntil: Mock;
  getResponse: () => Promise<MockResponse> | undefined;
  settle: () => Promise<unknown[]>;
}

export function createFetchEvent(request: MockRequest): FetchEventLike {
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

export function createLifecycleEvent() {
  const waits: Array<Promise<unknown>> = [];
  return {
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      waits.push(promise);
    }),
    settle: () => Promise.all(waits),
  };
}
