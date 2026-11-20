import { address } from "@solana/kit";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { getSolanaRpcUrl } from "config/rpc";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
import { metrics } from "lib/metrics";
import { registerRpcTracker } from "lib/rpc/registry";

import { SolanaRpcTracker } from "../rpc";

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
  setIsSolanaNetworkSelected(false);
  localStorage.clear();
  setAbFlagEnabled("solanaNetwork", false);
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

it.each(["network", "slot", "http"])("reads accounts despite a %s probe failure", async (failure) => {
  const tracker = createTracker();
  const client = tracker.getRpc();
  let failed = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      expect(String(url)).toBe(getSolanaRpcUrl());
      const { id, method, params } = JSON.parse(init.body);
      if (failed && failure === "http" && method !== "getMultipleAccounts") {
        return new Response("Unavailable", { status: 503 });
      }
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
  expect(tracker.fallbackTracker.getEndpointStats(tracker.endpoint)?.checkResults[0].success).toBe(false);
  expect(tracker.getRpc()).toBe(client);
  await expect(tracker.fetchAccounts([owner])).resolves.toEqual([null]);
  tracker.fallbackTracker.banEndpoint(tracker.endpoint, "test failure");
  await expect(tracker.fetchAccounts([owner])).resolves.toEqual([null]);
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
    setAbFlagEnabled("solanaNetwork", true);
    setIsSolanaNetworkSelected(true);
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
      expect(tracker.getRpc()).toBe(tracker.rpc);
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

it("stops Solana probes on EVM and resumes only while Solana is enabled and selected FESOL-89", async () => {
  vi.useFakeTimers();
  const tracker = createTracker();
  const requests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const { id, method } = JSON.parse(init.body);
      requests.push(method);
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: method === "getGenesisHash" ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" : 123,
      });
    })
  );
  const selectSolana = (selected: boolean) => {
    setIsSolanaNetworkSelected(selected);
    document.dispatchEvent(
      new CustomEvent("networkChange", { detail: { chainId: selected ? SOLANA_NETWORK_ID : ARBITRUM } })
    );
  };
  const unregister = registerRpcTracker(tracker);
  try {
    selectSolana(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests).toEqual([]);
    setAbFlagEnabled("solanaNetwork", true);
    selectSolana(true);
    selectSolana(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests).toEqual([]);
    selectSolana(true);
    selectSolana(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests.sort()).toEqual(["getGenesisHash", "getSlot"]);
    expect(tracker.getRpc()).toBe(tracker.rpc);
    selectSolana(false);
    const stoppedAt = requests.length;
    document.dispatchEvent(new CustomEvent("visibilitychange", { detail: undefined }));
    await vi.advanceTimersByTimeAsync(40_000);
    expect(requests).toHaveLength(stoppedAt);
    expect(tracker.fallbackTracker.state.trackerTimeoutId).toBeUndefined();
    selectSolana(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests).toHaveLength(stoppedAt + 2);
    unregister();
    selectSolana(false);
    selectSolana(true);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(requests).toHaveLength(stoppedAt + 2);
  } finally {
    unregister();
  }
});

it("keeps this tab's Solana selection when another tab changes storage", async () => {
  vi.useFakeTimers();
  setAbFlagEnabled("solanaNetwork", true);
  setIsSolanaNetworkSelected(true);
  localStorage.removeItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY);
  const tracker = createTracker();
  const probe = vi.spyOn(tracker, "checkEndpoint").mockResolvedValue({ responseTime: 20, slot: 123n });
  const unregister = registerRpcTracker(tracker);
  try {
    await vi.advanceTimersByTimeAsync(5000);
    expect(probe).toHaveBeenCalledTimes(1);
    setIsSolanaNetworkSelected(false);
    localStorage.setItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY, "true");
    document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: ARBITRUM } }));
    await vi.advanceTimersByTimeAsync(40_000);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(tracker.fallbackTracker.state.trackerTimeoutId).toBeUndefined();
  } finally {
    unregister();
  }
});
