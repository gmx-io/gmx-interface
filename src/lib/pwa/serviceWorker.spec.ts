import { readFileSync } from "node:fs";
import { cwd } from "node:process";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const SERVICE_WORKER_SOURCE = readFileSync(`${cwd()}/public/sw.js`, "utf8");
const APP_SHELL_HTML = `
  <meta name="gmx-pwa-build-id" content="2" />
  <meta name="gmx-pwa-enabled" content="true" />
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

function loadFetchHandler(fetch: ReturnType<typeof vi.fn>) {
  const listeners = new Map<string, (event: FetchEvent) => void>();
  const cachedShell = new Response("cached shell", {
    headers: { "content-type": "text/html" },
  });
  const caches = {
    match: vi.fn(async (request: string, options?: { cacheName?: string }) => {
      if (request === "/index.html" && options?.cacheName === "gmx-pwa-shell-v2-2") {
        return cachedShell.clone();
      }
      return undefined;
    }),
  };
  const worker = {
    addEventListener: (type: string, listener: (event: FetchEvent) => void) => listeners.set(type, listener),
    clients: {
      claim: vi.fn(),
    },
    location: {
      href: "https://app.example/sw.js?build=2",
      origin: "https://app.example",
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

  const fetchHandler = listeners.get("fetch");
  if (!fetchHandler) {
    throw new Error("Service worker fetch handler was not registered");
  }

  return fetchHandler;
}

async function dispatchNavigation(fetchHandler: (event: FetchEvent) => void) {
  let responsePromise: Promise<Response> | undefined;
  const backgroundPromises: Promise<unknown>[] = [];

  fetchHandler({
    request: {
      destination: "document",
      method: "GET",
      mode: "navigate",
      url: "https://app.example/trade",
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

describe("PWA service worker navigation", () => {
  it("returns the network shell when online", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(APP_SHELL_HTML, {
        headers: { "content-type": "text/html" },
      })
    );

    const response = await dispatchNavigation(loadFetchHandler(fetch));

    expect(await response.text()).toContain('content="2"');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the cached shell after a server error", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));

    const response = await dispatchNavigation(loadFetchHandler(fetch));

    expect(await response.text()).toBe("cached shell");
  });

  it("falls back to the cached shell when offline", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));

    const response = await dispatchNavigation(loadFetchHandler(fetch));

    expect(await response.text()).toBe("cached shell");
  });
});
