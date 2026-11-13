import { act, cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID, type NetworkId } from "config/chains";
import { useSolanaRpcTracking } from "lib/rpc/useSolanaRpcTracking";

import { getSolanaRpcTracker } from "./rpc";

vi.hoisted(() => {
  // Kit captures the controller at import time and needs the native implementation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transferableAbortController } = require("node:util");
  const controller = transferableAbortController();
  vi.stubGlobal("AbortController", controller.constructor);
  vi.stubGlobal("AbortSignal", controller.signal.constructor);
});

afterEach(() => {
  cleanup();
  getSolanaRpcTracker().fallbackTracker.cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

it("stops probes on EVM, resumes the same client on Solana, and aborts pending probes on deselection", async () => {
  vi.useFakeTimers();
  const requests: string[] = [];
  const pendingSignals: AbortSignal[] = [];
  let holdProbes = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const { id, method } = JSON.parse(init.body);
      requests.push(method);
      if (holdProbes) {
        pendingSignals.push(init.signal);
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
        });
      }
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: method === "getGenesisHash" ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" : 123,
      });
    })
  );
  function Consumer({ networkId }: { networkId: NetworkId }) {
    useSolanaRpcTracking(networkId);
    return null;
  }
  const view = render(createElement(Consumer, { networkId: ARBITRUM }));
  // Even a late singleton initialization after switching to EVM must not start probes.
  const tracker = getSolanaRpcTracker();
  const client = tracker.rpc;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(40_000);
  });
  expect(requests).toEqual([]);

  view.rerender(createElement(Consumer, { networkId: SOLANA_NETWORK_ID }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(requests).toEqual(["getGenesisHash", "getSlot"]);
  tracker.getRpc();
  view.rerender(createElement(Consumer, { networkId: ARBITRUM }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(40_000);
  });
  expect(requests).toHaveLength(2);

  view.rerender(createElement(Consumer, { networkId: SOLANA_NETWORK_ID }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(requests).toHaveLength(4);
  expect(getSolanaRpcTracker()).toBe(tracker);
  expect(tracker.getRpc()).toBe(client);

  holdProbes = true;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(pendingSignals).toHaveLength(2);
  view.rerender(createElement(Consumer, { networkId: ARBITRUM }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(pendingSignals.every((signal) => signal.aborted)).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(40_000);
  });
  expect(requests).toHaveLength(6);

  holdProbes = false;
  view.rerender(createElement(Consumer, { networkId: SOLANA_NETWORK_ID }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(requests).toHaveLength(8);
  view.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(40_000);
  });
  expect(requests).toHaveLength(8);
});
