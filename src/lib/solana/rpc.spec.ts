import { address } from "@solana/kit";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { getSolanaRpcUrl } from "config/rpc";
import { metrics } from "lib/metrics";
import { registerRpcTracker } from "lib/rpc/registry";

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

it.each([
  [0, []],
  [1, [1]],
  [100, [100]],
  [101, [100, 1]],
] as const)("reads %s accounts through the configured Alchemy client", async (count, expectedBatches) => {
  const tracker = createTracker();
  const batches: number[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      expect(String(url)).toBe(getSolanaRpcUrl());
      const { id, params } = JSON.parse(init.body);
      batches.push(params[0].length);
      return Response.json({ jsonrpc: "2.0", id, result: { context: { slot: 1 }, value: params[0].map(() => null) } });
    })
  );
  await expect(tracker.fetchAccounts(Array(count).fill(owner))).resolves.toEqual(Array(count).fill(null));
  expect(batches).toEqual(expectedBatches);
});

it.each(["http", "rpc", "incomplete", "timeout"])(
  "rejects the complete snapshot on a %s batch failure",
  async (failure) => {
    const tracker = createTracker();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        expect(String(url)).toBe(getSolanaRpcUrl());
        const { id, params } = JSON.parse(init.body);
        if (params[0].length === 1) {
          if (failure === "http") return new Response("Unavailable", { status: 503 });
          if (failure === "timeout") throw new DOMException("Timed out", "TimeoutError");
          if (failure === "rpc")
            return Response.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "RPC unavailable" } });
          return Response.json({ jsonrpc: "2.0", id, result: { context: { slot: 1 }, value: [] } });
        }
        return Response.json({
          jsonrpc: "2.0",
          id,
          result: { context: { slot: 1 }, value: params[0].map(() => null) },
        });
      })
    );
    await expect(tracker.fetchAccounts(Array(101).fill(owner))).rejects.toThrow();
    expect(tracker.fallbackTracker.getEndpointStats(tracker.endpoint)?.failureTimestamps).toHaveLength(1);
  }
);

it.each(["network", "slot", "http"])("recovers the same client after a %s probe failure and ban", async (failure) => {
  const tracker = createTracker();
  const client = tracker.getRpc();
  let failed = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      expect(String(url)).toBe(getSolanaRpcUrl());
      const { id, method, params } = JSON.parse(init.body);
      if (failed && failure === "http") return new Response("Unavailable", { status: 503 });
      const result =
        method === "getGenesisHash"
          ? failed && failure === "network"
            ? "wrong-network"
            : "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
          : method === "getSlot"
            ? failed && failure === "slot"
              ? -1
              : 9007199254740993n.toString()
            : { context: { slot: 1 }, value: params[0].map(() => null) };
      // Keep the RPC slot numeric on the wire without losing integer precision.
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id, result }).replace('"9007199254740993"', "9007199254740993")
      );
    })
  );
  await tracker.fallbackTracker.checkEndpoints(new AbortController());
  expect(() => tracker.getRpc()).toThrow("No healthy Solana RPC endpoint available");
  await expect(tracker.fetchAccounts([owner])).rejects.toThrow();
  tracker.fallbackTracker.banEndpoint(tracker.endpoint, "test failure");
  failed = false;
  await tracker.fallbackTracker.checkEndpoints(new AbortController());
  expect(tracker.getRpc()).toBe(client);
  expect(tracker.fallbackTracker.getEndpointStats(tracker.endpoint)?.checkResults[0].stats?.slot).toBe(
    9007199254740993n
  );
  await expect(tracker.fetchAccounts([owner])).resolves.toEqual([null]);
});

it.each([true, false])(
  "reports probe failure and recovery once from initial health %s FESOL-89",
  async (initiallyHealthy) => {
    vi.useFakeTimers();
    const tracker = createTracker();
    const probe = vi.spyOn(tracker, "checkEndpoint").mockResolvedValue({ responseTime: 20, slot: 123n });
    if (!initiallyHealthy) probe.mockRejectedValue(new Error("RPC unavailable"));
    const unregister = registerRpcTracker(tracker);
    metrics.queue = [];
    try {
      tracker.getRpc();
      await vi.advanceTimersByTimeAsync(5000);
      probe.mockRejectedValue(new Error("RPC unavailable"));
      await vi.advanceTimersByTimeAsync(20_000);
      expect(() => tracker.getRpc()).toThrow("No healthy Solana RPC endpoint available");
      probe.mockResolvedValue({ responseTime: 20, slot: 124n });
      await vi.advanceTimersByTimeAsync(20_000);
      expect(tracker.getRpc()).toBe(tracker.rpc);
      const healthReports = metrics.queue.flatMap((item) =>
        item.type === "event" && item.payload.event === "rpcTracker.endpoint.health"
          ? [{ isError: item.payload.isError, ...item.payload.customFields }]
          : []
      );
      expect(healthReports).toMatchObject([
        {
          chainId: tracker.params.chainId,
          endpoint: new URL(tracker.endpoint).hostname,
          isHealthy: false,
          isError: true,
        },
        {
          chainId: tracker.params.chainId,
          endpoint: new URL(tracker.endpoint).hostname,
          isHealthy: true,
          isError: false,
        },
      ]);
    } finally {
      unregister();
      metrics.queue = [];
    }
  }
);
