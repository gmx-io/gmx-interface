import { describe, expect, it } from "vitest";

import type { ExpressTxnParams } from "domain/synthetics/express";

import { estimateWithApproximateFallback } from "../expressOrderUtils";

const SIMULATED = { estimationMethod: "estimateGas" } as ExpressTxnParams;
const APPROXIMATE = { estimationMethod: "approximate" } as ExpressTxnParams;

describe("estimateWithApproximateFallback", () => {
  it("prices with the simulated gas limit and falls back to approximate PRO-4599", async () => {
    const cases = [
      { name: "simulation succeeds", simulate: async () => SIMULATED, expected: SIMULATED },
      { name: "simulation returns nothing", simulate: async () => undefined, expected: APPROXIMATE },
      { name: "simulation throws", simulate: () => Promise.reject(new Error("rpc failed")), expected: APPROXIMATE },
    ];

    for (const { name, simulate, expected } of cases) {
      const result = await estimateWithApproximateFallback((method) =>
        method === "estimateGas" ? simulate() : Promise.resolve(APPROXIMATE)
      );

      expect(result, name).toBe(expected);
    }
  });
});
