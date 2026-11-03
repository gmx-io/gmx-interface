import { address } from "@solana/kit";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { SOLANA_NETWORK_ID } from "config/chains";
import { getRpcProviders } from "config/rpc";

import { SolanaRpcTracker } from "./rpc";

const nativeAbort = vi.hoisted(() => {
  // Kit captures the controller at import time; its Node transport needs the native implementation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transferableAbortController } = require("node:util");
  const controller = transferableAbortController();
  vi.stubGlobal("AbortController", controller.constructor);
  vi.stubGlobal("AbortSignal", controller.signal.constructor);
  return { Controller: controller.constructor, Signal: controller.signal.constructor };
});

beforeEach(() => {
  vi.stubGlobal("AbortController", nativeAbort.Controller);
  vi.stubGlobal("AbortSignal", nativeAbort.Signal);
});

const owner = address("11111111111111111111111111111111");
const trackers: SolanaRpcTracker[] = [];
function createTracker() {
  const tracker = new SolanaRpcTracker();
  trackers.push(tracker);
  return tracker;
}
afterEach(() => {
  trackers.forEach((tracker) => tracker.fallbackTracker.cleanup());
  trackers.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

it.each(["http", "rpc", "incomplete", "timeout", "all-failed"])(
  "retries the full read on fallback after %s and propagates total failure",
  async (failure) => {
    const tracker = createTracker();
    const fallback = getRpcProviders(SOLANA_NETWORK_ID, "fallback")[0].url;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        const { id, params } = JSON.parse(init.body);
        if (String(url) !== fallback || failure === "all-failed") {
          if (failure === "timeout") throw new DOMException("Timed out", "TimeoutError");
          if (failure === "http") return new Response("Unavailable", { status: 503 });
          if (failure === "incomplete")
            return Response.json({ jsonrpc: "2.0", id, result: { context: { slot: 1 }, value: [] } });
          return Response.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "RPC unavailable" } });
        }
        return Response.json({
          jsonrpc: "2.0",
          id,
          result: { context: { slot: 1 }, value: params[0].map(() => null) },
        });
      })
    );
    if (failure === "all-failed") await expect(tracker.fetchAccounts(Array(21).fill(owner))).rejects.toThrow();
    else await expect(tracker.fetchAccounts(Array(21).fill(owner))).resolves.toEqual(Array(21).fill(null));
  }
);

it("selects healthy public nodes, retains Alchemy as fallback and recovers after probe failure", async () => {
  const tracker = createTracker();
  const [primary, fallback] = tracker.providers;
  let failed = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      const { id, method } = JSON.parse(init.body);
      const result =
        method === "getGenesisHash"
          ? failed && String(url) === primary.url
            ? "wrong-network"
            : "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
          : 1000;
      return Response.json({ jsonrpc: "2.0", id, result });
    })
  );
  await tracker.fallbackTracker.checkEndpoints(new AbortController());
  tracker.fallbackTracker.selectBestEndpoints();
  expect(tracker.fallbackTracker.getCurrentEndpoints()).toMatchObject({
    primary: primary.url,
    fallbacks: [fallback.url],
  });
  failed = true;
  await tracker.fallbackTracker.checkEndpoints(new AbortController());
  expect(tracker.rank(tracker.fallbackTracker.getEndpointsStats()).map((item) => item.endpoint)).toEqual([
    fallback.url,
  ]);
  failed = false;
  await tracker.fallbackTracker.checkEndpoints(new AbortController());
  expect(tracker.rank(tracker.fallbackTracker.getEndpointsStats()).map((item) => item.endpoint)).toEqual([
    primary.url,
    fallback.url,
  ]);
  expect(tracker.getClient(primary.url)).not.toBe(tracker.getClient(fallback.url));
});

it.each([
  [800n, false, ["primary", "secondary"]],
  [1200n, false, ["primary", "secondary"]],
  [1000n, true, ["secondary", "fallback", "primary"]],
] as const)("ranks slot outliers and banned nodes: %s %s", (fallbackSlot, banned, expected) => {
  const [primary, fallback] = createTracker().providers;
  const tracker = new SolanaRpcTracker([
    { ...primary, url: "https://primary.example" },
    { ...primary, url: "https://secondary.example" },
    { ...fallback, url: "https://fallback.example" },
  ]);
  trackers.push(tracker);
  const stats = tracker.providers.map((provider, index) => ({
    endpoint: provider.url,
    failureTimestamps: [],
    failureThrottleTimeout: undefined,
    bannedEmitted: undefined,
    banned: banned && index === 0 ? { timestamp: Date.now(), reason: "test failure" } : undefined,
    checkResults: [
      { endpoint: provider.url, success: true, stats: { responseTime: 10, slot: index === 2 ? fallbackSlot : 1000n } },
    ],
  }));
  expect(tracker.rank(stats).map((item) => new URL(item.endpoint).hostname.split(".")[0])).toEqual(expected);
});
