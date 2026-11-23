import { address } from "@solana/kit";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";
import { getSolanaRpcUrl } from "config/rpc";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
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

it.each(["slot", "http"])("reads accounts despite a %s probe failure", async (failure) => {
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
          ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
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
  await expect(tracker.fetchAccounts([owner])).resolves.toEqual([null]);
});

it("rejects the wrong network until an uncancelled mainnet check recovers TRD-98", async () => {
  const tracker = createTracker();
  let genesis = "wrong-network";
  let httpFailure = false;
  let invalidSlot = false;
  const accountReads: string[] = [];
  let finishRead: (() => void) | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const { id, method } = JSON.parse(init.body);
      if (method === "getMultipleAccounts") {
        accountReads.push(method);
        await new Promise<void>((resolve) => {
          finishRead = resolve;
        });
        return Response.json({ jsonrpc: "2.0", id, result: { context: { slot: 1 }, value: [null] } });
      }
      if (httpFailure) return new Response("Unavailable", { status: 503 });
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: method === "getGenesisHash" ? genesis : invalidSlot ? -1 : 123,
      });
    })
  );
  const probe = () => tracker.fallbackTracker.checkEndpoints(new AbortController());
  const pendingRead = tracker.fetchAccounts([owner]);
  await vi.waitFor(() => expect(finishRead).toBeDefined());
  await probe();
  const rejectedRead = expect(pendingRead).rejects.toThrow("not on Mainnet");
  finishRead!();
  await rejectedRead;
  httpFailure = true;
  await probe();
  expect(() => tracker.getRpc()).toThrow("not on Mainnet");
  await expect(tracker.fetchAccounts([owner])).rejects.toThrow("not on Mainnet");
  expect(accountReads).toHaveLength(1);
  httpFailure = false;
  genesis = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
  const cancelled = new AbortController();
  const cancelledProbe = tracker.fallbackTracker.checkEndpoints(cancelled);
  cancelled.abort();
  await cancelledProbe;
  expect(() => tracker.getRpc()).toThrow("not on Mainnet");
  invalidSlot = true;
  await probe();
  expect(tracker.getRpc()).toBe(tracker.rpc);
  const recoveredRead = tracker.fetchAccounts([owner]);
  await vi.waitFor(() => expect(accountReads).toHaveLength(2));
  finishRead!();
  await expect(recoveredRead).resolves.toEqual([null]);
});

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
    localStorage.removeItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests.sort()).toEqual(["getGenesisHash", "getSlot"]);
    expect(tracker.getRpc()).toBe(tracker.rpc);
    selectSolana(false);
    localStorage.setItem(SELECTED_SOLANA_NETWORK_LOCAL_STORAGE_KEY, "true");
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
