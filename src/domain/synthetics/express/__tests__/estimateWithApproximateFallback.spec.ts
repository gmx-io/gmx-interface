import { describe, expect, it, vi } from "vitest";

import type { ExpressTxnParams } from "domain/synthetics/express";
import { sleep } from "lib/sleep";

import { estimateWithApproximateFallback } from "../expressOrderUtils";

const SIMULATED = { estimationMethod: "estimateGas" } as ExpressTxnParams;
const APPROXIMATE = { estimationMethod: "approximate" } as ExpressTxnParams;

describe("estimateWithApproximateFallback", () => {
  it("prices with the simulated gas limit and falls back to approximate PRO-4599", async () => {
    vi.useFakeTimers();

    const cases = [
      { name: "simulation succeeds", simulate: async () => SIMULATED, expected: SIMULATED },
      { name: "simulation returns nothing", simulate: async () => undefined, expected: APPROXIMATE },
      { name: "simulation throws", simulate: () => Promise.reject(new Error("rpc failed")), expected: APPROXIMATE },
      { name: "simulation stalls", simulate: () => sleep(60_000).then(() => SIMULATED), expected: APPROXIMATE },
    ];

    for (const { name, simulate, expected } of cases) {
      const result = estimateWithApproximateFallback((method) =>
        method === "estimateGas" ? simulate() : Promise.resolve(APPROXIMATE)
      );

      await vi.runAllTimersAsync();

      expect(await result, name).toBe(expected);
    }

    vi.useRealTimers();
  });
});
